import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe, SUBSCRIPTION_PLANS } from "@/lib/stripe";
import type { ApiResponse } from "@/types";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { subscription, plans: SUBSCRIPTION_PLANS },
    });
  } catch (error) {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to load subscription" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { priceId, successUrl, cancelUrl } = await req.json();
    if (!priceId) {
      return NextResponse.json<ApiResponse>({ success: false, error: "priceId required" }, { status: 400 });
    }

    let subscription = await prisma.subscription.findUnique({ where: { userId: session.user.id } });

    let customerId = subscription?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: session.user.name ?? undefined,
        metadata: { userId: session.user.id },
      });
      customerId = customer.id;

      if (!subscription) {
        subscription = await prisma.subscription.create({
          data: { userId: session.user.id, stripeCustomerId: customerId },
        });
      } else {
        await prisma.subscription.update({
          where: { userId: session.user.id },
          data: { stripeCustomerId: customerId },
        });
      }
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: successUrl ?? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: cancelUrl ?? `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      metadata: { userId: session.user.id },
    });

    return NextResponse.json<ApiResponse>({ success: true, data: { url: checkoutSession.url } });
  } catch (error) {
    console.error("[SUBSCRIPTION CREATE]", error);
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to create checkout session" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await prisma.subscription.findUnique({ where: { userId: session.user.id } });
    if (!subscription?.stripeSubscriptionId) {
      return NextResponse.json<ApiResponse>({ success: false, error: "No active subscription" }, { status: 400 });
    }

    await stripe.subscriptions.update(subscription.stripeSubscriptionId, { cancel_at_period_end: true });
    await prisma.subscription.update({
      where: { userId: session.user.id },
      data: { cancelAtPeriodEnd: true },
    });

    return NextResponse.json<ApiResponse>({ success: true, message: "Subscription will cancel at period end" });
  } catch (error) {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to cancel subscription" }, { status: 500 });
  }
}
