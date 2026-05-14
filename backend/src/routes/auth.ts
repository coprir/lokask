import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// ─── POST /auth/signup ────────────────────────────────────────

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
  user_type: z.enum(['customer', 'provider', 'both']),
  phone: z.string().optional(),
});

router.post('/signup', async (req: Request, res: Response) => {
  const { email, password, name, user_type, phone } = SignupSchema.parse(req.body);

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, user_type },
  });

  if (authError || !authData.user) {
    throw new AppError(authError?.message || 'Failed to create account', 400);
  }

  const { data: userRow, error: insertError } = await supabaseAdmin
    .from('users')
    .insert({
      id: authData.user.id,
      email,
      name,
      user_type,
      phone: phone || null,
    })
    .select()
    .single();

  if (insertError) {
    // Roll back auth user if DB insert fails
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    throw new AppError('Failed to create user profile', 500);
  }

  res.status(201).json({
    success: true,
    data: { user: userRow, message: 'Account created' },
  });
});

// ─── POST /auth/login ─────────────────────────────────────────

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = LoginSchema.parse(req.body);

  const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    throw new AppError(error?.message || 'Invalid credentials', 401);
  }

  res.json({
    success: true,
    data: { session: data.session, user: data.user },
  });
});

// ─── POST /auth/sync-role ─────────────────────────────────────

router.post('/sync-role', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { user_type } = z.object({
    user_type: z.enum(['customer', 'provider', 'both']),
  }).parse(req.body);

  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ user_type })
    .eq('id', req.user!.id)
    .select()
    .single();

  if (error) throw new AppError('Failed to sync user_type', 500);

  res.json({ success: true, data });
});

export default router;
