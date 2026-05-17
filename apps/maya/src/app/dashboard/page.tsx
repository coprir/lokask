import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { FanLeaderboard } from "@/components/dashboard/fan-leaderboard";
import { SafetyLogs } from "@/components/dashboard/safety-logs";
import { prisma } from "@/lib/prisma";
import { Bot, BarChart3, Shield, Users } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [safetyLogs, recentEvents] = await Promise.all([
    prisma.safetyLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.analyticsEvent.findMany({ orderBy: { createdAt: "desc" }, take: 20, select: { event: true, createdAt: true, userId: true } }),
  ]);

  return (
    <div className="min-h-screen bg-cyber-darker">
      <div className="border-b border-white/5 glass px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyber-pink to-cyber-purple flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold">Admin Dashboard</h1>
              <p className="text-xs text-white/40">MAYA AI Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/chat" className="text-sm text-white/50 hover:text-white flex items-center gap-1">
              <Bot className="h-4 w-4" /> Chat
            </Link>
            <Link href="/feed" className="text-sm text-white/50 hover:text-white flex items-center gap-1">
              <Users className="h-4 w-4" /> Feed
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <DashboardStats />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FanLeaderboard />
          <SafetyLogs logs={safetyLogs as never} />
        </div>
      </div>
    </div>
  );
}
