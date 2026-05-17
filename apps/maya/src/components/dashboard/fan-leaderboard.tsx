"use client";

import { useEffect, useState } from "react";
import { Trophy, Loader2 } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface FanEntry {
  id: string;
  name?: string;
  email: string;
  engagementScore: number;
  totalMessages: number;
  fanTier: number;
  rank: number;
  badge: string;
  subscription?: { tier: string };
}

export function FanLeaderboard() {
  const [fans, setFans] = useState<FanEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d) => { if (d.success) setFans(d.data.fans.slice(0, 10)); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="glass rounded-2xl border border-white/5 overflow-hidden">
      <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-cyber-pink" />
        <h3 className="font-semibold">Top Fans</h3>
      </div>
      <div className="divide-y divide-white/5">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-5 w-5 animate-spin text-cyber-pink" />
          </div>
        ) : (
          fans.map((fan) => (
            <div key={fan.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/2 transition-colors">
              <span className="text-lg w-8 text-center">{fan.badge}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{fan.name ?? fan.email.split("@")[0]}</div>
                <div className="text-xs text-white/40">{formatNumber(fan.totalMessages)} messages</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono text-cyber-pink">{fan.engagementScore.toFixed(1)}</div>
                <div className="text-xs text-white/30">{fan.subscription?.tier ?? "FREE"}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
