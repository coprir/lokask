// backend/src/routes/services.ts
import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// ─── Zod Schemas ──────────────────────────────────────────────

const CATEGORY_VALUES = [
  'cleaning', 'tutoring', 'beauty', 'fitness', 'delivery',
  'cooking', 'photography', 'handyman', 'childcare', 'pet_care',
  'translation', 'tech',
] as const;

const AvailabilitySchema = z.object({
  days: z.array(z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])),
  slots: z.array(z.string().regex(/^\d{2}:\d{2}$/)),
}).optional();

const CreateServiceSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(20).max(1000),
  category: z.enum(CATEGORY_VALUES),
  price_type: z.enum(['hourly', 'fixed']),
  price: z.number().positive().max(10000),
  images: z.array(z.string().url()).max(5).optional().default([]),
  availability: AvailabilitySchema,
  is_featured: z.boolean().optional().default(false),
});

const SearchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  min_price: z.coerce.number().optional(),
  max_price: z.coerce.number().optional(),
  min_rating: z.coerce.number().optional(),
  featured: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

// ─── GET /services — search + browse ─────────────────────────

router.get('/', async (req, res: Response) => {
  const params = SearchSchema.parse(req.query);
  const offset = (params.page - 1) * params.limit;

  let query = supabaseAdmin
    .from('services')
    .select(`
      *,
      provider:users!services_provider_id_fkey(
        id, name, profile_image, location_label, rating, total_bookings
      )
    `, { count: 'exact' })
    .eq('is_active', true)
    .order('rating', { ascending: false })
    .range(offset, offset + params.limit - 1);

  if (params.category) query = query.eq('category', params.category);
  if (params.min_price) query = query.gte('price', params.min_price);
  if (params.max_price) query = query.lte('price', params.max_price);
  if (params.min_rating) query = query.gte('rating', params.min_rating);
  if (params.featured) query = query.eq('is_featured', true);
  if (params.q) {
    query = query.textSearch('title', params.q, { type: 'websearch' });
  }

  const { data, count, error } = await query;
  if (error) throw new AppError('Failed to fetch services', 500);

  res.json({
    success: true,
    data,
    total: count ?? 0,
    page: params.page,
    limit: params.limit,
    has_more: (count ?? 0) > offset + params.limit,
  });
});

// ─── GET /services/:id ────────────────────────────────────────

router.get('/:id', async (req, res: Response) => {
  const { id } = req.params;

  const { data, error } = await supabaseAdmin
    .from('services')
    .select(`
      *,
      provider:users!services_provider_id_fkey(
        id, name, profile_image, location_label, rating, total_bookings
      )
    `)
    .eq('id', id)
    .single();

  if (error || !data) throw new AppError('Service not found', 404);

  // Fetch recent reviews via bookings join
  const { data: reviews } = await supabaseAdmin
    .from('reviews')
    .select(`
      *,
      reviewer:users!reviews_reviewer_id_fkey(
        id, name, profile_image
      )
    `)
    .eq('booking_id',
      supabaseAdmin
        .from('bookings')
        .select('id')
        .eq('service_id', id) as any
    )
    .order('created_at', { ascending: false })
    .limit(10);

  res.json({ success: true, data: { ...data, reviews: reviews || [] } });
});

// ─── POST /services — create service ─────────────────────────

router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const body = CreateServiceSchema.parse(req.body);
  const providerId = req.user!.id;

  const { data, error } = await supabaseAdmin
    .from('services')
    .insert({
      ...body,
      provider_id: providerId,
    })
    .select()
    .single();

  if (error) throw new AppError(`Failed to create service: ${error.message}`, 500);

  res.status(201).json({ success: true, data });
});

// ─── PUT /services/:id ───────────────────────────────────────

router.put('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  // Verify ownership
  const { data: existing } = await supabaseAdmin
    .from('services')
    .select('provider_id')
    .eq('id', id)
    .single();

  if (!existing || existing.provider_id !== req.user!.id) {
    throw new AppError('Not authorized to edit this service', 403);
  }

  const UpdateSchema = CreateServiceSchema.partial();
  const body = UpdateSchema.parse(req.body);

  const { data, error } = await supabaseAdmin
    .from('services')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new AppError('Failed to update service', 500);

  res.json({ success: true, data });
});

// ─── DELETE /services/:id (soft delete) ──────────────────────

router.delete('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const { data: existing } = await supabaseAdmin
    .from('services')
    .select('provider_id')
    .eq('id', id)
    .single();

  if (!existing || existing.provider_id !== req.user!.id) {
    throw new AppError('Not authorized', 403);
  }

  const { error } = await supabaseAdmin
    .from('services')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw new AppError('Failed to deactivate service', 500);

  res.json({ success: true, message: 'Service deactivated' });
});

export default router;
