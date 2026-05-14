// backend/src/routes/reviews.ts
import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const CreateReviewSchema = z.object({
  booking_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(280).optional(),
});

const ReplySchema = z.object({
  reply: z.string().max(500),
});

// ─── GET /reviews?provider_id= ───────────────────────────────

router.get('/', async (req, res: Response) => {
  const { provider_id, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let query = supabaseAdmin
    .from('reviews')
    .select(`
      *,
      reviewer:users!reviews_reviewer_id_fkey(id, name, profile_image)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + Number(limit) - 1);

  if (provider_id) query = query.eq('reviewee_id', provider_id);

  const { data, count, error } = await query;
  if (error) throw new AppError('Failed to fetch reviews', 500);

  res.json({ success: true, data, total: count ?? 0 });
});

// ─── POST /reviews ────────────────────────────────────────────

router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const body = CreateReviewSchema.parse(req.body);
  const reviewerId = req.user!.id;

  // Verify booking completion and reviewer is the customer
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('customer_id, provider_id, status')
    .eq('id', body.booking_id)
    .single();

  if (!booking) throw new AppError('Booking not found', 404);
  if (booking.customer_id !== reviewerId) throw new AppError('Only the customer can leave a review', 403);
  if (booking.status !== 'completed') throw new AppError('Can only review completed bookings', 400);

  // Check no duplicate review
  const { data: existing } = await supabaseAdmin
    .from('reviews')
    .select('id')
    .eq('booking_id', body.booking_id)
    .maybeSingle();

  if (existing) throw new AppError('You have already reviewed this booking', 409);

  const { data, error } = await supabaseAdmin
    .from('reviews')
    .insert({
      booking_id: body.booking_id,
      reviewer_id: reviewerId,
      reviewee_id: booking.provider_id,
      rating: body.rating,
      comment: body.comment,
    })
    .select()
    .single();

  if (error) throw new AppError('Failed to submit review', 500);

  // Notify the provider
  const { data: reviewer } = await supabaseAdmin
    .from('users')
    .select('name')
    .eq('id', reviewerId)
    .single();

  const { data: provider } = await supabaseAdmin
    .from('users')
    .select('fcm_token')
    .eq('id', booking.provider_id)
    .single();

  if (provider?.fcm_token) {
    const { sendNotification } = await import('../services/notifications');
    await sendNotification({
      token: provider.fcm_token,
      title: 'New Review',
      body: `${reviewer?.name} gave you ${body.rating} stars`,
      data: { type: 'review', booking_id: body.booking_id },
    });
  }

  await supabaseAdmin.from('notifications').insert({
    user_id: booking.provider_id,
    type: 'review',
    title: 'New Review',
    body: `${reviewer?.name} gave you ${body.rating} stars`,
    data: { booking_id: body.booking_id },
  });

  res.status(201).json({ success: true, data });
});

// ─── PUT /reviews/:id/reply ───────────────────────────────────

router.put('/:id/reply', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { reply } = ReplySchema.parse(req.body);
  const userId = req.user!.id;

  // Must be the reviewee (provider)
  const { data: review } = await supabaseAdmin
    .from('reviews')
    .select('reviewee_id, provider_reply')
    .eq('id', id)
    .single();

  if (!review) throw new AppError('Review not found', 404);
  if (review.reviewee_id !== userId) throw new AppError('Only the provider can reply to this review', 403);
  if (review.provider_reply) throw new AppError('A reply already exists', 409);

  const { data, error } = await supabaseAdmin
    .from('reviews')
    .update({ provider_reply: reply })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new AppError('Failed to save reply', 500);

  res.json({ success: true, data });
});

export default router;
