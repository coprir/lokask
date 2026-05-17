"use client";

import { useState } from "react";
import { Check, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import type { StripeSubscriptionPlan } from "@/types";

interface Props {
  plan: StripeSubscriptionPlan;
  isAuthenticated: boolean;
  featured?: boolean;
}

export function PricingCard({ plan, isAuthenticated, featured }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubscribe = async () => {
    if (!isAuthenticated) { router.push("/login"); return; }
    if (plan.tier === "FREE") return;
    setLoading(true);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: plan.priceId }),
      });
      const data = await res.json();
      if (data.success && data.data.url) {
        window.location.href = data.data.url;
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`relative glass rounded-2xl p-6 border transition-all duration-300 hover:scale-105 ${
      featured
        ? "border-cyber-pink/50 shadow-lg shadow-cyber-pink/10"
        : "border-white/5 hover:border-cyber-pink/20"
    }`}>
      {featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-cyber-pink to-cyber-purple text-white text-xs font-bold flex items-center gap-1">
          <Zap className="h-3 w-3" /> Most Popular
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
        <div className="flex items-end gap-1">
          <span className="text-4xl font-bold gradient-text">
            {plan.price === 0 ? "Free" : formatCurrency(plan.price)}
          </span>
          {plan.price > 0 && <span className="text-white/40 text-sm mb-1">/month</span>}
        </div>
        <p className="text-sm text-white/40 mt-1">{plan.messageQuota === 999999 ? "Unlimited" : plan.messageQuota} messages/month</p>
      </div>

      <ul className="space-y-2.5 mb-6">
        {plan.features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-white/70">
            <Check className="h-3.5 w-3.5 text-cyber-pink shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      <Button
        onClick={handleSubscribe}
        disabled={loading || plan.tier === "FREE"}
        variant={featured ? "default" : "outline"}
        className="w-full"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : plan.tier === "FREE" ? (
          "Current Plan"
        ) : (
          `Get ${plan.name}`
        )}
      </Button>
    </div>
  );
}
