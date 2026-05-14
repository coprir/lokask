import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import bookingRoutes from '../../routes/bookings';
import { errorHandler } from '../../middleware/errorHandler';
import { supabaseAdmin } from '../../config/supabase';

jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: 'customer-1', email: 'customer@test.com', role: 'customer' };
    next();
  },
}));

jest.mock('../../services/notifications', () => ({
  sendNotification: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/conversations', () => ({
  createConversation: jest.fn().mockResolvedValue(undefined),
}));

const mockFrom = supabaseAdmin.from as jest.Mock;

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/bookings', bookingRoutes);
  app.use(errorHandler);
  return app;
}

describe('GET /bookings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns a paginated list of bookings', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      then: jest.fn().mockResolvedValue({
        data: [{ id: 'booking-1', status: 'pending' }],
        count: 1,
        error: null,
      }),
    });

    const res = await request(makeApp()).get('/bookings');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /bookings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 422 for missing required fields', async () => {
    const res = await request(makeApp())
      .post('/bookings')
      .send({ notes: 'no service_id or scheduled_at' });
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 404 when the service does not exist', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: new Error('not found') }),
    });

    const res = await request(makeApp())
      .post('/bookings')
      .send({
        service_id: '00000000-0000-0000-0000-000000000001',
        scheduled_at: '2026-06-01T10:00:00.000Z',
      });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Service not found');
  });

  it('prevents booking your own service', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'service-1',
          provider_id: 'customer-1', // same as authenticated user
          price: 50,
          price_unit: 'fixed',
          is_active: true,
          currency: 'USD',
        },
        error: null,
      }),
    });

    const res = await request(makeApp())
      .post('/bookings')
      .send({
        service_id: '00000000-0000-0000-0000-000000000001',
        scheduled_at: '2026-06-01T10:00:00.000Z',
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Cannot book your own service');
  });
});

describe('PATCH /bookings/:id/status', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 422 for invalid status value', async () => {
    const res = await request(makeApp())
      .patch('/bookings/booking-1/status')
      .send({ status: 'flying' });
    expect(res.status).toBe(422);
  });

  it('returns 404 when the booking does not exist', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: new Error('not found') }),
    });

    const res = await request(makeApp())
      .patch('/bookings/nonexistent/status')
      .send({ status: 'cancelled' });
    expect(res.status).toBe(404);
  });

  it('blocks invalid status transitions', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'booking-1',
          status: 'completed',
          customer_id: 'customer-1',
          provider_id: 'provider-1',
          customer: { fcm_token: null, full_name: 'Customer' },
          provider: { fcm_token: null, full_name: 'Provider' },
        },
        error: null,
      }),
    });

    const res = await request(makeApp())
      .patch('/bookings/booking-1/status')
      .send({ status: 'cancelled' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Cannot transition from completed to cancelled/);
  });
});
