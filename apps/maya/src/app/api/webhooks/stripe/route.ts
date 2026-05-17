import { NextRequest, NextResponse } from "next/server";
import { stripe, getTierFromPriceId } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("[STRIPE WEBHOOK] Invalid signature:", err);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (!userId || !session.subscription) break;

        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        const priceId = sub.items.data[0]?.price.id;
        const tier = getTierFromPriceId(priceId);

        await prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: sub.id,
            stripePriceId: priceId,
            tier,
            status: "ACTIVE",
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            monthlyMessageQuota: tier === "BASIC" ? 100 : tier === "PREMIUM" ? 500 : 999999,
            voiceEnabled: tier !== "FREE",
            exclusiveContent: tier === "PREMIUM" || tier === "VIP",
          },
          update: {
            stripeSubscriptionId: sub.id,
            stripePriceId: priceId,
            tier,
            status: "ACTIVE",
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            monthlyMessageQuota: tier === "BASIC" ? 100 : tier === "PREMIUM" ? 500 : 999999,
            voiceEnabled: tier !== "FREE",
            exclusiveContent: tier === "PREMIUM" || tier === "VIP",
          },
        });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const priceId = sub.items.data[0]?.price.id;
        const tier = getTierFromPriceId(priceId);

        const dbSub = await prisma.subscription.findFirst({ where: { stripeCustomerId: customerId } });
        if (dbSub) {
          await prisma.subscription.update({
            where: { id: dbSub.id },
            data: {
              tier,
              status: sub.status.toUpperCase() as "ACTIVE",
              stripePriceId: priceId,
              cancelAtPeriodEnd: sub.cancel_at_period_end,
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
            },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: { tier: "FREE", status: "CANCELED", stripeSubscriptionId: null, voiceEnabled: false, exclusiveContent: false },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await prisma.subscription.updateMany({
          where: { stripeCustomerId: invoice.customer as string },
          data: { status: "PAST_DUE" },
        });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const sub = await prisma.subscription.findFirst({ where: { stripeCustomerId: invoice.customer as string } });
        if (sub) {
          await Promise.all([
            prisma.subscription.update({ where: { id: sub.id }, data: { status: "ACTIVE", messagesUsed: 0 } }),
            prisma.payment.create({
              data: {
                subscriptionId: sub.id,
                stripePaymentId: invoice.id,
                amount: invoice.amount_paid,
                currency: invoice.currency,
                status: "succeeded",
              },
            }),
          ]);
        }
        break;
      }
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("[STRIPE WEBHOOK ERROR]", error);
    return new NextResponse("Webhook handler error", { status: 500 });
  }
}
