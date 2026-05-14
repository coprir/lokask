import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// ─── GET /users/me ────────────────────────────────────────────

router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', req.user!.id)
    .single();

  if (error || !data) throw new AppError('User not found', 404);

  res.json({ success: true, data });
});

// ─── PUT /users/me ────────────────────────────────────────────

router.put('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const allowed = [
    'name', 'phone', 'profile_image', 'bio',
    'location_lat', 'location_lng', 'location_label',
    'nationality', 'language', 'fcm_token',
  ];
  const updates: Record<string, unknown> = {};

  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', req.user!.id)
    .select()
    .single();

  if (error) throw new AppError('Failed to update profile', 500);

  res.json({ success: true, data });
});

// ─── GET /users/:id ───────────────────────────────────────────

router.get('/:id', async (req, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select(`
      id, name, profile_image, location_label, language,
      rating, total_bookings, is_premium, bio, nationality,
      created_at,
      services:services(
        id, title, category, price_type, price, images,
        is_active, is_featured, rating, review_count, created_at
      )
    `)
    .eq('id', req.params.id)
    .is('deleted_at', null)
    .single();

  if (error || !data) throw new AppError('User not found', 404);

  res.json({ success: true, data });
});

export default router;
