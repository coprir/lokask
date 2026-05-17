"use client";

import { useEffect, useState } from "react";
import { Users, MessageCircle, DollarSign, TrendingUp, Loader2 } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { DashboardStats as Stats } from "@/types";

export function DashboardStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => { if (d.success) setStats(d.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-cyber-pink" />
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    { label: "Total Users", value: formatNumber(stats.totalUsers), sub: `${formatNumber(stats.activeUsers)} active`, icon: Users, color: "text-cyber-pink" },
    { label: "Total Revenue", value: formatCurrency(stats.totalRevenue * 100), sub: `${formatCurrency(stats.monthlyRevenue * 100)} this month`, icon: DollarSign, color: "text-green-400" },
    { label: "Total Messages", value: formatNumber(stats.totalMessages), sub: "All time", icon: MessageCircle, color: "text-cyber-blue" },
    { label: "Avg Engagement", value: stats.avgEngagementScore.toFixed(2), sub: "Score per user", icon: TrendingUp, color: "text-cyber-purple" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="glass rounded-2xl p-5 border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-white/40">{c.label}</span>
            <c.icon className={`h-4 w-4 ${c.color}`} />
          </div>
          <div className="text-2xl font-bold mb-0.5">{c.value}</div>
          <div className="text-xs text-white/30">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
