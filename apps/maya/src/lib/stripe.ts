import Stripe from "stripe";
import type { StripeSubscriptionPlan, SubscriptionTier } from "@/types";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
  typescript: true,
});

export const SUBSCRIPTION_PLANS: StripeSubscriptionPlan[] = [
  {
    id: "free",
    name: "Free",
    tier: "FREE",
    price: 0,
    priceId: "",
    features: [
      "20 messages/month",
      "Basic chat with Maya",
      "Feed access",
      "AI disclosure badge",
    ],
    messageQuota: 20,
    voiceEnabled: false,
    exclusiveContent: false,
  },
  {
    id: "basic",
    name: "Basic Fan",
    tier: "BASIC",
    price: 999,
    priceId: process.env.STRIPE_PRICE_BASIC ?? "",
    features: [
      "100 messages/month",
      "Priority responses",
      "Voice messages",
      "Exclusive photos",
      "Fan leaderboard",
    ],
    messageQuota: 100,
    voiceEnabled: true,
    exclusiveContent: false,
  },
  {
    id: "premium",
    name: "Premium Fan",
    tier: "PREMIUM",
    price: 2499,
    priceId: process.env.STRIPE_PRICE_PREMIUM ?? "",
    features: [
      "500 messages/month",
      "Voice messages",
      "All exclusive content",
      "Early access to AI selfies",
      "Custom mood requests",
      "Memory priority",
    ],
    messageQuota: 500,
    voiceEnabled: true,
    exclusiveContent: true,
  },
  {
    id: "vip",
    name: "VIP Superfan",
    tier: "VIP",
    price: 4999,
    priceId: process.env.STRIPE_PRICE_VIP ?? "",
    features: [
      "Unlimited messages",
      "All premium features",
      "Personalized AI content",
      "Direct voice note requests",
      "First access to new personas",
      "VIP badge in leaderboard",
    ],
    messageQuota: 999999,
    voiceEnabled: true,
    exclusiveContent: true,
  },
];

export function getTierFromPriceId(priceId: string): SubscriptionTier {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.priceId === priceId);
  return plan?.tier ?? "FREE";
}
