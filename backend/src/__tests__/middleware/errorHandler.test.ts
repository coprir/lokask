import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';
import { AppError, errorHandler } from '../../middleware/errorHandler';

function makeApp(handler: (req: Request, res: Response, next: NextFunction) => void) {
  const app = express();
  app.use(express.json());
  app.get('/test', handler);
  app.use(errorHandler);
  return app;
}

describe('errorHandler middleware', () => {
  it('handles AppError with the correct status code', async () => {
    const app = makeApp((_req, _res, next) => {
      next(new AppError('Not found', 404));
    });
    const res = await request(app).get('/test');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Not found');
  });

  it('handles ZodError with 422 and field details', async () => {
    const app = makeApp((_req, _res, next) => {
      try {
        z.object({ name: z.string() }).parse({ name: 123 });
      } catch (err) {
        next(err);
      }
    });
    const res = await request(app).get('/test');
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Validation failed');
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  it('handles unknown errors with 500', async () => {
    const app = makeApp((_req, _res, next) => {
      next(new Error('Something exploded'));
    });
    const res = await request(app).get('/test');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Internal server error');
  });

  it('AppError defaults to 500 when no status given', async () => {
    const app = makeApp((_req, _res, next) => {
      next(new AppError('Oops'));
    });
    const res = await request(app).get('/test');
    expect(res.status).toBe(500);
  });
});
