import 'express-async-errors';
import request from 'supertest';
import express from 'express';
import { authenticate } from '../../middleware/auth';
import { errorHandler } from '../../middleware/errorHandler';
import { supabaseAdmin } from '../../config/supabase';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.get('/protected', authenticate, (req: any, res) => {
    res.json({ user: req.user });
  });
  app.use(errorHandler);
  return app;
}

describe('authenticate middleware', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects requests with no Authorization header', async () => {
    const res = await request(makeApp()).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Missing authorization token/);
  });

  it('rejects requests with a malformed Authorization header', async () => {
    const res = await request(makeApp())
      .get('/protected')
      .set('Authorization', 'Token abc123');
    expect(res.status).toBe(401);
  });

  it('rejects an invalid Supabase token', async () => {
    (supabaseAdmin.auth.getUser as jest.Mock).mockResolvedValueOnce({
      data: { user: null },
      error: new Error('invalid token'),
    });

    const res = await request(makeApp())
      .get('/protected')
      .set('Authorization', 'Bearer bad-token');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Invalid or expired token/);
  });

  it('rejects inactive accounts', async () => {
    (supabaseAdmin.auth.getUser as jest.Mock).mockResolvedValueOnce({
      data: { user: { id: 'user-1', email: 'test@test.com' } },
      error: null,
    });

    (supabaseAdmin.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'user-1', email: 'test@test.com', user_type: 'customer', deleted_at: '2024-01-01T00:00:00Z' },
        error: null,
      }),
    });

    const res = await request(makeApp())
      .get('/protected')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Account is inactive/);
  });

  it('attaches user to request for valid token', async () => {
    (supabaseAdmin.auth.getUser as jest.Mock).mockResolvedValueOnce({
      data: { user: { id: 'user-1', email: 'test@test.com' } },
      error: null,
    });

    (supabaseAdmin.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'user-1', email: 'test@test.com', user_type: 'provider', deleted_at: null },
        error: null,
      }),
    });

    const res = await request(makeApp())
      .get('/protected')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe('user-1');
    expect(res.body.user.user_type).toBe('provider');
  });
});
