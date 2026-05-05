// backend/src/routes/services.ts
import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// ─── Zod Schemas ──────────────────────────────────────────────

const CreateServiceSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(20).max(2000),
  category: z.enum([
    'cleaning', 'tutoring', 'delivery', 'handyman', 'beauty',
    'tech_support', 'childcare', 'pet_care', 'cooking',
    'translation', 'fitness', 'photography', 'other',
  ]),
  price: z.number().positive().max(10000),
  price_unit: z.enum(['hourly', 'fixed', 'daily']),
  duration_minutes: z.number().positive().optional(),
  images: z.array(z.string().url()).max(10).optional().default([]),
  tags: z.array(z.string()).max(15).optional().default([]),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  service_area_km: z.number().positive().max(100).optional().default(10),
  is_remote: z.boolean().optional().default(false),
});

const SearchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radius_km: z.coerce.number().optional().default(10),
  min_price: z.coerce.number().optional(),
  max_price: z.coerce.number().optional(),
  min_rating: z.coerce.number().optional(),
  is_remote: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

// ─── GET /services — search + browse ─────────────────────────

router.get('/', async (req, res: Response) => {
  const params = SearchSchema.parse(req.query);
  const offset = (params.page - 1) * params.limit;

  // Use geo RPC if lat/lng provided
  if (params.lat && params.lng) {
    const { data, error } = await supabaseAdmin.rpc('find_nearby_services', {
      p_lat: params.lat,
      p_lng: params.lng,
      p_radius_km: params.radius_km,
      p_category: params.category || null,
      p_limit: params.limit,
    });

    if (error) throw new AppError('Failed to fetch services', 500);

    res.json({ success: true, data, page: params.page, limit: params.limit });
    return;
  }

  // Standard query
  let query = supabaseAdmin
    .from('services')
    .select(`
      *,
      provider:users!services_provider_id_fkey(
        id, full_name, avatar_url, city
      )
    `, { count: 'exact' })
    .eq('is_active', true)
    .order('rating_avg', { ascending: false })
    .range(offset, offset + params.limit - 1);

  if (params.category) query = query.eq('category', params.category);
  if (params.min_price) query = query.gte('price', params.min_price);
  if (params.max_price) query = query.lte('price', params.max_price);
  if (params.min_rating) query = query.gte('rating_avg', params.min_rating);
  if (params.is_remote !== undefined) query = query.eq('is_remote', params.is_remote);
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
        id, full_name, avatar_url, city, created_at,
        provider_profiles(
          bio, tagline, skills, languages, rating_avg,
          review_count, completed_jobs, is_available,
          response_time_minutes, id_verified
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error || !data) throw new AppError('Service not found', 404);

  // Increment view count (fire-and-forget)
  supabaseAdmin
    .from('services')
    .update({ view_count: (data.view_count || 0) + 1 })
    .eq('id', id)
    .then(() => {});

  // Fetch recent reviews
  const { data: reviews } = await supabaseAdmin
    .from('reviews')
    .select(`
      *,
      reviewer:users!reviews_reviewer_id_fkey(
        id, full_name, avatar_url
      )
    `)
    .eq('service_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  res.json({ success: true, data: { ...data, reviews: reviews || [] } });
});

// ─── POST /services — create service ─────────────────────────

router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const body = CreateServiceSchema.parse(req.body);
  const providerId = req.user!.id;

  // Build location point if lat/lng provided
  const locationValue = body.lat && body.lng
    ? `POINT(${body.lng} ${body.lat})`
    : null;

  const { data, error } = await supabaseAdmin
    .from('services')
    .insert({
      ...body,
      provider_id: providerId,
      location: locationValue,
    })
    .select()
    .single();

  if (error) throw new AppError(`Failed to create service: ${error.message}`, 500);

  // Ensure provider_profile exists
  const { data: profile } = await supabaseAdmin
    .from('provider_profiles')
    .select('user_id')
    .eq('user_id', providerId)
    .single();

  if (!profile) {
    await supabaseAdmin
      .from('provider_profiles')
      .insert({ user_id: providerId });
  }

  res.status(201).json({ success: true, data });
});

// ─── PATCH /services/:id ──────────────────────────────────────

router.patch('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
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

  const locationValue = body.lat && body.lng
    ? `POINT(${body.lng} ${body.lat})`
    : undefined;

  const { data, error } = await supabaseAdmin
    .from('services')
    .update({ ...body, ...(locationValue ? { location: locationValue } : {}) })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new AppError('Failed to update service', 500);

  res.json({ success: true, data });
});

// ─── DELETE /services/:id ─────────────────────────────────────

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

  // Soft delete
  const { error } = await supabaseAdmin
    .from('services')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw new AppError('Failed to delete service', 500);

  res.json({ success: true, message: 'Service deactivated' });
});

export default router;
