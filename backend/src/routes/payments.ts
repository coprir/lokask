// backend/src/routes/payments.ts
// LOKASK Payment Flow — 100% of payment goes to provider
// (minus only Stripe's processing fee ~1.4% + €0.25 in EU)

import { Router, Response } from 'express';
import { z } from 'zod';
import Stripe from 'stripe';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../middleware/errorHandler';
import { config } from '../config/env';

const router = Router();
const stripe = new Stripe(config.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });

const CreatePaymentSchema = z.object({
  booking_id: z.string().uuid(),
});

// ─── POST /payments/intent — Create Stripe PaymentIntent ──────

router.post('/intent', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { booking_id } = CreatePaymentSchema.parse(req.body);
  const customerId = req.user!.id;

  // Fetch booking
  const { data: booking, error: bookingError } = await supabaseAdmin
    .from('bookings')
    .select('*, provider:users!bookings_provider_id_fkey(stripe_account_id)')
    .eq('id', booking_id)
    .single();

  if (bookingError || !booking) throw new AppError('Booking not found', 404);
  if (booking.customer_id !== customerId) throw new AppError('Not authorized', 403);
  if (booking.payment_status === 'succeeded') throw new AppError('Booking already paid', 400);

  const providerStripeAccountId = booking.provider?.stripe_account_id;
  if (!providerStripeAccountId) {
    throw new AppError('Provider has not set up payouts yet. Please contact the provider.', 400);
  }

  // Get or create Stripe customer
  let stripeCustomerId = await getOrCreateStripeCustomer(customerId, req.user!.email);

  // Amount in smallest currency unit (cents)
  const amountCents = Math.round(booking.total_amount * 100);

  // Create PaymentIntent with destination charge
  // Full amount goes to provider's Stripe Connect account
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: booking.currency.toLowerCase(),
    customer: stripeCustomerId,
    transfer_data: {
      destination: providerStripeAccountId,
    },
    // No application_fee_amount — 0 platform cut
    metadata: {
      booking_id: booking_id,
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
      customer_id: customerId,
      provider_id: booking.provider_id,
      stripe_payment_intent_id: paymentIntent.id,
      amount: booking.total_amount,
      currency: booking.currency,
      status: 'pending',
      provider_amount: booking.total_amount, // full amount — no cut
    })
    .select()
    .single();

  if (paymentError) throw new AppError('Failed to record payment', 500);

  // Link payment to booking
  await supabaseAdmin
    .from('bookings')
    .update({ payment_id: payment.id, payment_status: 'processing' })
    .eq('id', booking_id);

  res.json({
    success: true,
    data: {
      client_secret: paymentIntent.client_secret,
      payment_id: payment.id,
      amount: booking.total_amount,
      currency: booking.currency,
    },
  });
});

// ─── GET /payments/provider/dashboard ────────────────────────

router.get('/provider/dashboard', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const providerId = req.user!.id;

  const { data, error } = await supabaseAdmin
    .from('payments')
    .select('amount, provider_amount, currency, status, created_at')
    .eq('provider_id', providerId)
    .eq('status', 'succeeded')
    .order('created_at', { ascending: false });

  if (error) throw new AppError('Failed to fetch earnings', 500);

  const totalEarnings = data?.reduce((sum, p) => sum + Number(p.provider_amount), 0) ?? 0;
  const thisMonth = data?.filter(p => {
    const d = new Date(p.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((sum, p) => sum + Number(p.provider_amount), 0) ?? 0;

  res.json({
    success: true,
    data: {
      total_earnings: totalEarnings,
      this_month: thisMonth,
      payment_count: data?.length ?? 0,
      payments: data ?? [],
    },
  });
});

// ─── POST /payments/connect/onboard — Stripe Connect Setup ───

router.post('/connect/onboard', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('stripe_account_id, email, full_name')
    .eq('id', userId)
    .single();

  let accountId = user?.stripe_account_id;

  if (!accountId) {
    // Create Express Stripe Connect account
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

  // Create onboarding link
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
