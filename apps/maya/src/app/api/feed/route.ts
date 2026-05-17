import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis, CACHE_KEYS } from "@/lib/redis";
import type { ApiResponse, PaginatedResponse, FeedPost } from "@/types";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const personaId = searchParams.get("personaId") ?? "maya";
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "12"), 50);

    const cacheKey = CACHE_KEYS.feedPosts(personaId, page);
    const cached = await redis.get(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }

    const [posts, total] = await Promise.all([
      prisma.feedPost.findMany({
        where: { personaId, OR: [{ isStory: false }, { isStory: true, expiresAt: { gt: new Date() } }] },
        include: { persona: { select: { name: true, avatarUrl: true, slug: true } } },
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.feedPost.count({ where: { personaId } }),
    ]);

    const response = {
      data: posts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };

    await redis.setex(cacheKey, 60, JSON.stringify(response));

    return NextResponse.json<PaginatedResponse<FeedPost>>({
      success: true,
      ...response,
    });
  } catch (error) {
    console.error("[FEED GET]", error);
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to load feed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { postId, action } = await req.json();
    if (!postId || !["like", "view"].includes(action)) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Invalid request" }, { status: 400 });
    }

    const update =
      action === "like"
        ? { likeCount: { increment: 1 } }
        : { viewCount: { increment: 1 } };

    const post = await prisma.feedPost.update({ where: { id: postId }, data: update });

    return NextResponse.json<ApiResponse>({ success: true, data: { likeCount: post.likeCount, viewCount: post.viewCount } });
  } catch (error) {
    return NextResponse.json<ApiResponse>({ success: false, error: "Action failed" }, { status: 500 });
  }
}
