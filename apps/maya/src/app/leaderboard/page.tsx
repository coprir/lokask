import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Trophy, Crown, Star, Flame, Heart } from "lucide-react";
import { formatNumber, formatRelativeTime } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function LeaderboardPage() {
  const [session, fans] = await Promise.all([
    auth(),
    prisma.user.findMany({
      orderBy: { engagementScore: "desc" },
      take: 50,
      select: {
        id: true, name: true, email: true, engagementScore: true,
        fanTier: true, totalMessages: true, lastActiveAt: true,
        subscription: { select: { tier: true } },
      },
    }),
  ]);

  const badges = ["👑", "⭐", "⭐", "🔥", "🔥", "🔥", "💜", "💜", "💜", "💜"];

  return (
    <div className="min-h-screen bg-cyber-darker py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <Trophy className="h-12 w-12 text-cyber-pink mx-auto mb-4 animate-float" />
          <h1 className="text-4xl font-bold gradient-text mb-2">Fan Leaderboard</h1>
          <p className="text-white/40">Top Maya superfans ranked by engagement</p>
        </div>

        {/* Top 3 */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[fans[1], fans[0], fans[2]].map((fan, i) => fan && (
            <div key={fan.id} className={`glass rounded-2xl p-4 text-center border ${i === 1 ? "border-cyber-pink/30 -mt-4" : "border-white/5"}`}>
              <div className="text-2xl mb-2">{i === 1 ? "👑" : i === 0 ? "⭐" : "🔥"}</div>
              <div className="font-semibold text-sm truncate">{fan.name ?? fan.email.split("@")[0]}</div>
              <div className="text-cyber-pink text-xs font-mono mt-1">{fan.engagementScore.toFixed(1)} pts</div>
              <div className="text-white/30 text-xs mt-0.5">{fan.subscription?.tier ?? "FREE"}</div>
            </div>
          ))}
        </div>

        {/* Full list */}
        <div className="glass rounded-2xl border border-white/5 divide-y divide-white/5 overflow-hidden">
          {fans.map((fan, i) => (
            <div key={fan.id} className={`flex items-center gap-4 px-5 py-4 ${fan.id === session?.user?.id ? "bg-cyber-pink/5" : "hover:bg-white/2"} transition-colors`}>
              <div className="w-8 text-center">
                {i < 10 ? <span className="text-lg">{badges[i]}</span> : <span className="text-sm text-white/30 font-mono">{i + 1}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{fan.name ?? fan.email.split("@")[0]}</span>
                  {fan.id === session?.user?.id && <span className="text-xs px-1.5 py-0.5 rounded bg-cyber-pink/20 text-cyber-pink">You</span>}
                </div>
                <div className="text-xs text-white/30">{formatNumber(fan.totalMessages)} messages · {fan.lastActiveAt ? formatRelativeTime(fan.lastActiveAt) : "never"}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono text-cyber-pink">{fan.engagementScore.toFixed(1)}</div>
                <div className="text-xs text-white/30">{fan.subscription?.tier ?? "FREE"}</div>
              </div>
            </div>
          ))}
        </div>

        {!session?.user?.id && (
          <div className="mt-8 text-center">
            <p className="text-white/40 text-sm mb-4">Join to appear on the leaderboard!</p>
            <Button asChild>
              <Link href="/register">Join Maya&apos;s Community →</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
