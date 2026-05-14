// backend/src/routes/webhooks.ts
import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { config } from '../config/env';
import { supabaseAdmin } from '../config/supabase';
import { sendNotification } from '../services/notifications';
import { logger } from '../utils/logger';

const router = Router();
const stripe = new Stripe(config.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });

// POST /api/v1/webhooks/stripe
// Body must be raw (set in index.ts before JSON middleware)
router.post('/stripe', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      config.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    logger.error(`Webhook signature failed: ${err.message}`);
    res.status(400).json({ error: 'Webhook signature verification failed' });
    return;
  }

  logger.info(`Stripe webhook: ${event.type}`);

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(pi);
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(pi);
        break;
      }

      case 'transfer.created': {
        const transfer = event.data.object as Stripe.Transfer;
        logger.info(`Transfer created: ${transfer.id} → ${transfer.destination}`);
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        await handleAccountUpdated(account);
        break;
      }

      default:
        logger.info(`Unhandled webhook event: ${event.type}`);
    }
  } catch (err: any) {
    logger.error(`Webhook handler error for ${event.type}: ${err.message}`);
    // Return 200 to avoid Stripe retrying — log and investigate manually
  }

  res.json({ received: true });
});

// ─── Handlers ────────────────────────────────────────────────

async function handlePaymentSucceeded(pi: Stripe.PaymentIntent): Promise<void> {
  const bookingId = pi.metadata.booking_id;
  const customerId = pi.metadata.customer_id;
  const providerId = pi.metadata.provider_id;

  // Update payment status: pending → captured, then escrow → held
  await supabaseAdmin
    .from('payments')
    .update({ status: 'held' })
    .eq('stripe_payment_intent_id', pi.id);

  // Update booking: payment_status → held, booking status → confirmed
  await supabaseAdmin
    .from('bookings')
    .update({ payment_status: 'held', status: 'confirmed' })
    .eq('id', bookingId);

  // Notify both parties
  const [{ data: customer }, { data: provider }] = await Promise.all([
    supabaseAdmin.from('users').select('fcm_token, name').eq('id', customerId).single(),
    supabaseAdmin.from('users').select('fcm_token, name').eq('id', providerId).single(),
  ]);

  const amount = (pi.amount / 100).toFixed(2);
  const currency = pi.currency.toUpperCase();

  if (customer?.fcm_token) {
    await sendNotification({
      token: customer.fcm_token,
      title: 'Payment Successful',
      body: `Your payment of ${currency} ${amount} was processed successfully.`,
      data: { type: 'payment', booking_id: bookingId },
    });
  }

  if (provider?.fcm_token) {
    await sendNotification({
      token: provider.fcm_token,
      title: 'Payment Received',
      body: `${customer?.name} paid ${currency} ${amount} for your service.`,
      data: { type: 'payment', booking_id: bookingId },
    });
  }

  await supabaseAdmin.from('notifications').insert([
    {
      user_id: customerId,
      type: 'payment',
      title: 'Payment Successful',
      body: `Your payment of ${currency} ${amount} was processed.`,
      data: { booking_id: bookingId },
    },
    {
      user_id: providerId,
      type: 'payment',
      title: 'Payment Received',
      body: `You received ${currency} ${amount} from ${customer?.name}.`,
      data: { booking_id: bookingId },
    },
  ]);
}

async function handlePaymentFailed(pi: Stripe.PaymentIntent): Promise<void> {
  const bookingId = pi.metadata.booking_id;
  const customerId = pi.metadata.customer_id;

  // Update payment status → failed, booking status → cancelled
  await supabaseAdmin
    .from('payments')
    .update({ status: 'failed' })
    .eq('stripe_payment_intent_id', pi.id);

  await supabaseAdmin
    .from('bookings')
    .update({ status: 'cancelled', payment_status: 'refunded' })
    .eq('id', bookingId);

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('fcm_token')
    .eq('id', customerId)
    .single();

  if (user?.fcm_token) {
    await sendNotification({
      token: user.fcm_token,
      title: 'Payment Failed',
      body: 'Your payment could not be processed. Please try again.',
      data: { type: 'payment', booking_id: bookingId },
    });
  }
}

async function handleAccountUpdated(account: Stripe.Account): Promise<void> {
  const lokaskUserId = account.metadata?.lokask_user_id;
  if (!lokaskUserId) return;

  if (account.charges_enabled) {
    logger.info(`Provider ${lokaskUserId} Stripe account fully activated`);

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('fcm_token')
      .eq('id', lokaskUserId)
      .single();

    if (user?.fcm_token) {
      await sendNotification({
        token: user.fcm_token,
        title: 'Payout Account Ready!',
        body: 'Your Stripe account is set up. You can now receive payments.',
        data: { type: 'system' },
      });
    }
  }
}

export default router;
