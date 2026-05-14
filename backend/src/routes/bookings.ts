// backend/src/routes/bookings.ts
import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../middleware/errorHandler';
import { sendNotification } from '../services/notifications';

const router = Router();

const CreateBookingSchema = z.object({
  service_id: z.string().uuid(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  scheduled_time: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:MM'),
  duration_hours: z.number().positive().optional(),
  notes: z.string().max(1000).optional(),
});

const UpdateStatusSchema = z.object({
  status: z.enum(['confirmed', 'in_progress', 'completed', 'cancelled']),
});

// ─── GET /bookings/me — list (customer or provider) ──────────

router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { role, status, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let query = supabaseAdmin
    .from('bookings')
    .select(`
      *,
      service:services(id, title, images, category, price_type, price),
      customer:users!bookings_customer_id_fkey(id, name, profile_image, phone),
      provider:users!bookings_provider_id_fkey(id, name, profile_image, phone)
    `, { count: 'exact' })
    .order('scheduled_date', { ascending: false })
    .range(offset, offset + Number(limit) - 1);

  if (role === 'provider') {
    query = query.eq('provider_id', userId);
  } else {
    query = query.eq('customer_id', userId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data, count, error } = await query;
  if (error) throw new AppError('Failed to fetch bookings', 500);

  res.json({
    success: true,
    data,
    total: count ?? 0,
    page: Number(page),
    limit: Number(limit),
    has_more: (count ?? 0) > offset + Number(limit),
  });
});

// ─── GET /bookings/:id ────────────────────────────────────────

router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select(`
      *,
      service:services(*),
      customer:users!bookings_customer_id_fkey(*),
      provider:users!bookings_provider_id_fkey(*),
      payment:payments(*)
    `)
    .eq('id', id)
    .single();

  if (error || !data) throw new AppError('Booking not found', 404);

  if (data.customer_id !== userId && data.provider_id !== userId) {
    throw new AppError('Not authorized to view this booking', 403);
  }

  res.json({ success: true, data });
});

// ─── POST /bookings ───────────────────────────────────────────

router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const body = CreateBookingSchema.parse(req.body);
  const customerId = req.user!.id;

  // Fetch service
  const { data: service, error: serviceError } = await supabaseAdmin
    .from('services')
    .select('id, provider_id, price, price_type, is_active')
    .eq('id', body.service_id)
    .single();

  if (serviceError || !service) throw new AppError('Service not found', 404);
  if (!service.is_active) throw new AppError('Service is not available', 400);
  if (service.provider_id === customerId) throw new AppError('Cannot book your own service', 400);

  const durationHours = body.duration_hours ?? 1;
  const totalAmount = service.price_type === 'hourly'
    ? Math.round(service.price * durationHours * 100) / 100
    : service.price;

  const { data: booking, error } = await supabaseAdmin
    .from('bookings')
    .insert({
      service_id: body.service_id,
      customer_id: customerId,
      provider_id: service.provider_id,
      scheduled_date: body.scheduled_date,
      scheduled_time: body.scheduled_time,
      duration_hours: durationHours,
      notes: body.notes,
      total_amount: totalAmount,
      status: 'pending',
      payment_status: 'unpaid',
    })
    .select()
    .single();

  if (error) throw new AppError(`Failed to create booking: ${error.message}`, 500);

  // Notify provider
  const { data: customer } = await supabaseAdmin
    .from('users')
    .select('name, fcm_token')
    .eq('id', customerId)
    .single();

  const { data: provider } = await supabaseAdmin
    .from('users')
    .select('fcm_token')
    .eq('id', service.provider_id)
    .single();

  if (provider?.fcm_token) {
    await sendNotification({
      token: provider.fcm_token,
      title: 'New Booking Request',
      body: `${customer?.name} wants to book your service`,
      data: { type: 'booking', booking_id: booking.id },
    });
  }

  await supabaseAdmin.from('notifications').insert({
    user_id: service.provider_id,
    type: 'booking',
    title: 'New Booking Request',
    body: `${customer?.name} wants to book your service`,
    data: { booking_id: booking.id },
  });

  res.status(201).json({ success: true, data: booking });
});

// ─── PUT /bookings/:id/status ─────────────────────────────────

router.put('/:id/status', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status } = UpdateStatusSchema.parse(req.body);
  const userId = req.user!.id;

  const { data: booking, error: fetchError } = await supabaseAdmin
    .from('bookings')
    .select(`
      *,
      customer:users!bookings_customer_id_fkey(fcm_token, name),
      provider:users!bookings_provider_id_fkey(fcm_token, name)
    `)
    .eq('id', id)
    .single();

  if (fetchError || !booking) throw new AppError('Booking not found', 404);

  const isCustomer = booking.customer_id === userId;
  const isProvider = booking.provider_id === userId;

  if (!isCustomer && !isProvider) throw new AppError('Not authorized', 403);

  // Status transition rules
  const transitions: Record<string, string[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['in_progress', 'cancelled'],
    in_progress: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
  };

  if (!transitions[booking.status]?.includes(status)) {
    throw new AppError(`Cannot transition from ${booking.status} to ${status}`, 400);
  }

  // Provider-only transitions
  if (['confirmed', 'in_progress'].includes(status) && !isProvider) {
    throw new AppError('Only provider can confirm/start a booking', 403);
  }

  const updates: Record<string, unknown> = { status };

  // Update payment_status on completion → released
  if (status === 'completed') {
    updates.payment_status = 'released';
    // Mark payment as released
    await supabaseAdmin
      .from('payments')
      .update({ status: 'released', released_at: new Date().toISOString() })
      .eq('booking_id', id);
  }

  // On cancellation → refunded
  if (status === 'cancelled') {
    updates.payment_status = 'refunded';
    await supabaseAdmin
      .from('payments')
      .update({ status: 'refunded' })
      .eq('booking_id', id);
  }

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new AppError('Failed to update booking', 500);

  // Notify the other party
  const notifyUserId = isProvider ? booking.customer_id : booking.provider_id;
  const notifyToken = isProvider ? booking.customer?.fcm_token : booking.provider?.fcm_token;

  const statusMessages: Record<string, string> = {
    confirmed: 'Your booking has been confirmed!',
    in_progress: 'Your service has started',
    completed: 'Booking completed! Please leave a review.',
    cancelled: 'Your booking was cancelled',
  };

  if (notifyToken) {
    await sendNotification({
      token: notifyToken,
      title: 'Booking Update',
      body: statusMessages[status],
      data: { type: 'booking', booking_id: id, status },
    });
  }

  await supabaseAdmin.from('notifications').insert({
    user_id: notifyUserId,
    type: 'booking',
    title: 'Booking Update',
    body: statusMessages[status],
    data: { booking_id: id, status },
  });

  res.json({ success: true, data });
});

export default router;
