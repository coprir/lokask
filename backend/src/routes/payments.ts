// backend/src/routes/payments.ts
import { Router, Response } from 'express';
import { z } from 'zod';
import Stripe from 'stripe';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../middleware/errorHandler';
import { config } from '../config/env';

const router = Router();
const stripe = new Stripe(config.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });

const PLATFORM_COMMISSION_RATE = 0.15;
const PREMIUM_COMMISSION_RATE = 0.10;
const CUSTOMER_BOOKING_FEE_RATE = 0.02;
const CUSTOMER_BOOKING_FEE_MIN = 0.50;
const CUSTOMER_BOOKING_FEE_MAX = 5.00;
const CUSTOMER_FEE_WAIVED_BOOKINGS = 3;

const CreatePaymentSchema = z.object({
  booking_id: z.string().uuid(),
});

// ─── GET /payments/earnings ───────────────────────────────────

router.get('/earnings', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const providerId = req.user!.id;

  // Join payments via bookings on provider_id
  const { data: releasedData, error: releasedError } = await supabaseAdmin
    .from('payments')
    .select(`
      provider_earnings, created_at,
      booking:bookings!payments_booking_id_fkey(provider_id)
    `)
    .eq('status', 'released');

  if (releasedError) throw new AppError('Failed to fetch earnings', 500);

  const { data: heldData, error: heldError } = await supabaseAdmin
    .from('payments')
    .select(`
      provider_earnings, created_at,
      booking:bookings!payments_booking_id_fkey(provider_id)
    `)
    .eq('status', 'held');

  if (heldError) throw new AppError('Failed to fetch held earnings', 500);

  const providerReleased = (releasedData || []).filter(
    (p: any) => p.booking?.provider_id === providerId
  );
  const providerHeld = (heldData || []).filter(
    (p: any) => p.booking?.provider_id === providerId
  );

  const totalEarned = providerReleased.reduce((sum, p) => sum + Number(p.provider_earnings), 0);
  const pendingPayout = providerHeld.reduce((sum, p) => sum + Number(p.provider_earnings), 0);

  // Weekly breakdown — last 8 weeks
  const weeklyMap: Record<string, number> = {};
  for (const p of providerReleased) {
    const d = new Date(p.created_at);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().split('T')[0];
    weeklyMap[key] = (weeklyMap[key] || 0) + Number(p.provider_earnings);
  }

  const weekly_breakdown = Object.entries(weeklyMap)
    .map(([week, amount]) => ({ week, amount }))
    .sort((a, b) => b.week.localeCompare(a.week))
    .slice(0, 8);

  res.json({
    success: true,
    data: {
      total_earned: Math.round(totalEarned * 100) / 100,
      pending_payout: Math.round(pendingPayout * 100) / 100,
      weekly_breakdown,
      transaction_list: providerReleased.map((p) => ({
        amount: p.provider_earnings,
        created_at: p.created_at,
        status: 'released',
      })),
    },
  });
});

// ─── POST /payments/intent — Create Stripe PaymentIntent ──────

router.post('/intent', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { booking_id } = CreatePaymentSchema.parse(req.body);
  const customerId = req.user!.id;

  // Fetch booking with provider info
  const { data: booking, error: bookingError } = await supabaseAdmin
    .from('bookings')
    .select(`
      *,
      provider:users!bookings_provider_id_fkey(stripe_account_id, is_premium)
    `)
    .eq('id', booking_id)
    .single();

  if (bookingError || !booking) throw new AppError('Booking not found', 404);
  if (booking.customer_id !== customerId) throw new AppError('Not authorized', 403);
  if (booking.payment_status !== 'unpaid') throw new AppError('Booking already has a payment', 400);

  const providerStripeAccountId = booking.provider?.stripe_account_id;
  if (!providerStripeAccountId) {
    throw new AppError('Provider has not set up payouts yet. Please contact the provider.', 400);
  }

  // Calculate fees
  const commissionRate = booking.provider?.is_premium ? PREMIUM_COMMISSION_RATE : PLATFORM_COMMISSION_RATE;
  const serviceAmount = Number(booking.total_amount);
  const platformFee = Math.round(serviceAmount * commissionRate * 100) / 100;

  // Count customer's completed bookings to determine if fee is waived
  const { count: bookingCount } = await supabaseAdmin
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('customer_id', customerId)
    .eq('status', 'completed');

  const customerFee = (bookingCount ?? 0) < CUSTOMER_FEE_WAIVED_BOOKINGS
    ? 0
    : Math.min(Math.max(serviceAmount * CUSTOMER_BOOKING_FEE_RATE, CUSTOMER_BOOKING_FEE_MIN), CUSTOMER_BOOKING_FEE_MAX);
  const customerFeeRounded = Math.round(customerFee * 100) / 100;

  const customerTotal = serviceAmount + customerFeeRounded;
  const providerEarnings = serviceAmount - platformFee;

  // Get or create Stripe customer
  const stripeCustomerId = await getOrCreateStripeCustomer(customerId, req.user!.email);

  const amountCents = Math.round(customerTotal * 100);
  const applicationFeeCents = Math.round(platformFee * 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'eur',
    customer: stripeCustomerId,
    transfer_data: {
      destination: providerStripeAccountId,
    },
    application_fee_amount: applicationFeeCents,
    metadata: {
      booking_id,
      customer_id: customerId,
      provider_id: booking.provider_id,
    },
    automatic_payment_methods: { enabled: true },
  });

  // Save payment record
  const { data: payment, error: paymentError } = await supabaseAdmin
    .from('payments')
    .insert({
      booking_id,
      stripe_payment_intent_id: paymentIntent.id,
      amount: customerTotal,
      platform_fee: platformFee,
      customer_fee: customerFeeRounded,
      provider_earnings: providerEarnings,
      status: 'pending',
    })
    .select()
    .single();

  if (paymentError) throw new AppError('Failed to record payment', 500);

  res.json({
    success: true,
    data: {
      client_secret: paymentIntent.client_secret,
      payment_id: payment.id,
      amount: customerTotal,
      platform_fee: platformFee,
      customer_fee: customerFeeRounded,
      provider_earnings: providerEarnings,
    },
  });
});

// ─── POST /payments/connect/onboard — Stripe Connect Setup ───

router.post('/connect/onboard', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('stripe_account_id, email, name')
    .eq('id', userId)
    .single();

  let accountId = user?.stripe_account_id;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      email: user?.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      metadata: { lokask_user_id: userId },
    });

    accountId = account.id;

    await supabaseAdmin
      .from('users')
      .update({ stripe_account_id: accountId })
      .eq('id', userId);
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${req.headers.origin}/provider/stripe/refresh`,
    return_url: `${req.headers.origin}/provider/stripe/success`,
    type: 'account_onboarding',
  });

  res.json({ success: true, data: { url: accountLink.url } });
});

// ─── GET /payments/connect/status ────────────────────────────

router.get('/connect/status', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('stripe_account_id')
    .eq('id', userId)
    .single();

  if (!user?.stripe_account_id) {
    res.json({ success: true, data: { connected: false, charges_enabled: false } });
    return;
  }

  const account = await stripe.accounts.retrieve(user.stripe_account_id);

  res.json({
    success: true,
    data: {
      connected: true,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      requirements: account.requirements?.currently_due ?? [],
    },
  });
});

// ─── Helpers ──────────────────────────────────────────────────

async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single();

  if (user?.stripe_customer_id) return user.stripe_customer_id;

  const customer = await stripe.customers.create({
    email,
    metadata: { lokask_user_id: userId },
  });

  await supabaseAdmin
    .from('users')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId);

  return customer.id;
}

export default router;
