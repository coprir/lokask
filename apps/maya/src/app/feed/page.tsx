import { Suspense } from "react";
import { FeedGrid } from "@/components/feed/feed-grid";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Bot } from "lucide-react";

export default async function FeedPage() {
  const session = await auth();

  const persona = await prisma.aiPersona.findFirst({
    where: { slug: "maya", isActive: true },
  });

  const initialPosts = await prisma.feedPost.findMany({
    where: { personaId: persona?.id },
    orderBy: { publishedAt: "desc" },
    take: 12,
    include: { persona: { select: { name: true, avatarUrl: true, slug: true } } },
  });

  return (
    <div className="min-h-screen bg-cyber-darker">
      {/* Header */}
      <div className="sticky top-0 z-10 glass border-b border-white/5 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyber-pink to-cyber-purple flex items-center justify-center">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{persona?.name ?? "Maya"}</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-cyber-pink/20 text-cyber-pink font-mono">AI</span>
            </div>
            <p className="text-xs text-white/40">AI-Generated Content · {persona?.followerCount?.toLocaleString() ?? "0"} followers</p>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="max-w-2xl mx-auto">
        <Suspense fallback={<FeedSkeleton />}>
          <FeedGrid
            initialPosts={initialPosts as never}
            personaId={persona?.id ?? ""}
            isAuthenticated={!!session?.user?.id}
          />
        </Suspense>
      </div>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-0.5 p-0.5">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="aspect-square bg-white/5 animate-pulse" />
      ))}
    </div>
  );
}
