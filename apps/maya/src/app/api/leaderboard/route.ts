import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import type { ApiResponse } from "@/types";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const cacheKey = "leaderboard:fans";
    const cached = await redis.get(cacheKey);
    if (cached) return NextResponse.json<ApiResponse>({ success: true, data: cached });

    const [topFans, totalUsers] = await Promise.all([
      prisma.user.findMany({
        orderBy: { engagementScore: "desc" },
        take: 50,
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          engagementScore: true,
          fanTier: true,
          totalMessages: true,
          subscription: { select: { tier: true } },
        },
      }),
      prisma.user.count(),
    ]);

    const ranked = topFans.map((fan, i) => ({
      ...fan,
      rank: i + 1,
      badge: i === 0 ? "👑" : i < 3 ? "⭐" : i < 10 ? "🔥" : "💜",
    }));

    const data = { fans: ranked, totalUsers };
    await redis.setex(cacheKey, 120, JSON.stringify(data));
    return NextResponse.json<ApiResponse>({ success: true, data });
  } catch (error) {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to load leaderboard" }, { status: 500 });
  }
}
