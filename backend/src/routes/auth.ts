import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// Supabase handles all auth (email, Google, Apple, Phone OTP)
// This endpoint syncs the user role after signup

router.post('/sync-role', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { role } = z.object({ role: z.enum(['customer', 'provider', 'both']) }).parse(req.body);

  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ role })
    .eq('id', req.user!.id)
    .select()
    .single();

  if (error) throw new AppError('Failed to sync role', 500);

  if (role !== 'customer') {
    await supabaseAdmin
      .from('provider_profiles')
      .upsert({ user_id: req.user!.id });
  }

  res.json({ success: true, data });
});

export default router;
