import { auth } from "@/lib/auth";
import { SUBSCRIPTION_PLANS } from "@/lib/stripe";
import { PricingCard } from "@/components/pricing-card";
import { Shield, Bot } from "lucide-react";

export default async function PricingPage() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-cyber-darker py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-cyber-pink/30 text-cyber-pink text-xs mb-6">
            <Bot className="h-3 w-3" /> Choose Your Fan Tier
          </div>
          <h1 className="text-5xl font-bold gradient-text mb-4">Fan Memberships</h1>
          <p className="text-white/50 text-lg">Unlock deeper connections with Maya</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              isAuthenticated={!!session?.user?.id}
              featured={plan.tier === "PREMIUM"}
            />
          ))}
        </div>

        <div className="mt-16 flex items-start gap-3 max-w-xl mx-auto p-4 glass rounded-xl border border-cyber-pink/10">
          <Shield className="h-5 w-5 text-cyber-pink shrink-0 mt-0.5" />
          <div className="text-sm text-white/50">
            <strong className="text-white/70">AI Disclosure:</strong> All subscriptions give access to Maya, an AI virtual influencer.
            You are paying for AI-generated content and interactions. Cancel anytime.
          </div>
        </div>
      </div>
    </div>
  );
}
