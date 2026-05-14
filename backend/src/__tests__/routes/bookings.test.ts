import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import bookingRoutes from '../../routes/bookings';
import { errorHandler } from '../../middleware/errorHandler';
import { supabaseAdmin } from '../../config/supabase';

jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: 'customer-1', email: 'customer@test.com', user_type: 'customer' };
    next();
  },
}));

jest.mock('../../services/notifications', () => ({
  sendNotification: jest.fn().mockResolvedValue(undefined),
}));

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/bookings', bookingRoutes);
  app.use(errorHandler);
  return app;
}

function mockFromWith(data: any, extras: Record<string, any> = {}) {
  const resolved = { data, error: null, count: Array.isArray(data) ? data.length : undefined, ...extras };
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(resolved),
    then: (resolve: any, reject: any) => Promise.resolve(resolved).then(resolve, reject),
    catch: (fn: any) => Promise.resolve(resolved).catch(fn),
    finally: (fn: any) => Promise.resolve(resolved).finally(fn),
  };
  (supabaseAdmin.from as jest.Mock).mockReturnValueOnce(chain);
  return chain;
}

function mockFromError(errorMsg: string) {
  const resolved = { data: null, error: new Error(errorMsg) };
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(resolved),
    then: (resolve: any, reject: any) => Promise.resolve(resolved).then(resolve, reject),
    catch: (fn: any) => Promise.resolve(resolved).catch(fn),
    finally: (fn: any) => Promise.resolve(resolved).finally(fn),
  };
  (supabaseAdmin.from as jest.Mock).mockReturnValueOnce(chain);
  return chain;
}

describe('GET /bookings/me', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns a paginated list of bookings', async () => {
    mockFromWith([{ id: 'booking-1', status: 'pending' }]);

    const res = await request(makeApp()).get('/bookings/me');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /bookings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 422 for missing required fields', async () => {
    const res = await request(makeApp())
      .post('/bookings')
      .send({ notes: 'no service_id or scheduled_date' });
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 404 when the service does not exist', async () => {
    mockFromError('not found');

    const res = await request(makeApp())
      .post('/bookings')
      .send({
        service_id: '00000000-0000-0000-0000-000000000001',
        scheduled_date: '2026-06-01',
        scheduled_time: '10:00',
      });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Service not found');
  });

  it('prevents booking your own service', async () => {
    const chain = mockFromWith({
      id: 'service-1',
      provider_id: 'customer-1',
      price: 50,
      price_type: 'fixed',
      is_active: true,
    });
    chain.single.mockResolvedValue({
      data: {
        id: 'service-1',
        provider_id: 'customer-1',
        price: 50,
        price_type: 'fixed',
        is_active: true,
      },
      error: null,
    });

    const res = await request(makeApp())
      .post('/bookings')
      .send({
        service_id: '00000000-0000-0000-0000-000000000001',
        scheduled_date: '2026-06-01',
        scheduled_time: '10:00',
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Cannot book your own service');
  });
});

describe('PUT /bookings/:id/status', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 422 for invalid status value', async () => {
    const res = await request(makeApp())
      .put('/bookings/booking-1/status')
      .send({ status: 'flying' });
    expect(res.status).toBe(422);
  });

  it('returns 404 when the booking does not exist', async () => {
    mockFromError('not found');

    const res = await request(makeApp())
      .put('/bookings/nonexistent/status')
      .send({ status: 'cancelled' });
    expect(res.status).toBe(404);
  });

  it('blocks invalid status transitions', async () => {
    const chain = mockFromWith(null);
    chain.single.mockResolvedValue({
      data: {
        id: 'booking-1',
        status: 'completed',
        customer_id: 'customer-1',
        provider_id: 'provider-1',
        customer: { fcm_token: null, name: 'Customer' },
        provider: { fcm_token: null, name: 'Provider' },
      },
      error: null,
    });

    const res = await request(makeApp())
      .put('/bookings/booking-1/status')
      .send({ status: 'cancelled' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Cannot transition from completed to cancelled/);
  });
});
