// backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AppError } from './errorHandler';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export async function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('Missing authorization token', 401);
  }

  const token = authHeader.split(' ')[1];

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    throw new AppError('Invalid or expired token', 401);
  }

  // Attach user profile (including role) from our users table
  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('id, email, role, is_active')
    .eq('id', user.id)
    .single();

  if (!profile?.is_active) {
    throw new AppError('Account is inactive', 403);
  }

  req.user = {
    id: user.id,
    email: user.email!,
    role: profile?.role || 'customer',
  };

  next();
}

// Optional auth — doesn't fail if no token
export async function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  try {
    await authenticate(req, _res, next);
  } catch {
    next();
  }
}

// Role guard
export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError('Insufficient permissions', 403);
    }
    next();
  };
}
