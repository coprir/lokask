import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { data } = await supabaseAdmin
    .from('users')
    .select('*, provider_profiles(*)')
    .eq('id', req.user!.id)
    .single();

  res.json({ success: true, data });
});

router.patch('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const allowed = ['full_name', 'phone', 'avatar_url', 'language', 'address', 'city', 'fcm_token'];
  const updates: Record<string, unknown> = {};

  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  if (req.body.lat && req.body.lng) {
    updates.location = `POINT(${req.body.lng} ${req.body.lat})`;
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

router.patch('/me/provider-profile', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const allowed = ['bio', 'tagline', 'skills', 'languages', 'nationality', 'is_available', 'availability_schedule', 'portfolio_urls'];
  const updates: Record<string, unknown> = {};

  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const { data } = await supabaseAdmin
    .from('provider_profiles')
    .upsert({ user_id: userId, ...updates })
    .select()
    .single();

  // Ensure user role is at least 'provider'
  await supabaseAdmin
    .from('users')
    .update({ role: 'provider' })
    .eq('id', userId)
    .eq('role', 'customer');

  res.json({ success: true, data });
});

router.get('/:id', async (req, res: Response) => {
  const { data } = await supabaseAdmin
    .from('users')
    .select(`
      id, full_name, avatar_url, city, created_at,
      provider_profiles(
        bio, tagline, skills, languages, rating_avg,
        review_count, completed_jobs, is_available, id_verified
      )
    `)
    .eq('id', req.params.id)
    .single();

  if (!data) throw new AppError('User not found', 404);

  res.json({ success: true, data });
});

export default router;
