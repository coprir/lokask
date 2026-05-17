import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redis, CACHE_KEYS } from "@/lib/redis";
import type { ApiResponse, DashboardStats } from "@/types";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const cacheKey = CACHE_KEYS.dashboardStats();
    const cached = await redis.get<DashboardStats>(cacheKey);
    if (cached) return NextResponse.json<ApiResponse>({ success: true, data: cached });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      totalPayments,
      monthlyPayments,
      totalMessages,
      avgEngagement,
      subBreakdown,
      topFans,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { lastActiveAt: { gte: sevenDaysAgo } } }),
      prisma.payment.aggregate({ _sum: { amount: true } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.message.count(),
      prisma.user.aggregate({ _avg: { engagementScore: true } }),
      prisma.subscription.groupBy({ by: ["tier"], _count: true }),
      prisma.user.findMany({ orderBy: { engagementScore: "desc" }, take: 10, select: { id: true, name: true, email: true, engagementScore: true, fanTier: true, avatarUrl: true } }),
    ]);

    const subscriptionBreakdown = Object.fromEntries(
      subBreakdown.map((s) => [s.tier, s._count])
    ) as DashboardStats["subscriptionBreakdown"];

    const stats: DashboardStats = {
      totalUsers,
      activeUsers,
      totalRevenue: (totalPayments._sum.amount ?? 0) / 100,
      monthlyRevenue: (monthlyPayments._sum.amount ?? 0) / 100,
      totalMessages,
      avgEngagementScore: avgEngagement._avg.engagementScore ?? 0,
      subscriptionBreakdown,
      topFans: topFans as DashboardStats["topFans"],
    };

    await redis.setex(cacheKey, 300, JSON.stringify(stats));
    return NextResponse.json<ApiResponse<DashboardStats>>({ success: true, data: stats });
  } catch (error) {
    console.error("[ANALYTICS]", error);
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to load analytics" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const { event, properties, sessionId } = await req.json();
    if (!event) return NextResponse.json<ApiResponse>({ success: false, error: "Event required" }, { status: 400 });

    await prisma.analyticsEvent.create({
      data: { userId: session?.user?.id, event, properties, sessionId },
    });
    return NextResponse.json<ApiResponse>({ success: true });
  } catch (error) {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to track event" }, { status: 500 });
  }
}
