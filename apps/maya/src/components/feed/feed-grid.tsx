"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Heart, Eye, MessageCircle, X, Bot, Lock } from "lucide-react";
import { formatNumber, formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { FeedPost } from "@/types";

interface Props {
  initialPosts: FeedPost[];
  personaId: string;
  isAuthenticated: boolean;
}

export function FeedGrid({ initialPosts, personaId, isAuthenticated }: Props) {
  const [posts, setPosts] = useState(initialPosts);
  const [selected, setSelected] = useState<FeedPost | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  const handleLike = async (post: FeedPost) => {
    if (!isAuthenticated) return;
    if (likedIds.has(post.id)) return;
    setLikedIds((prev) => new Set(prev).add(post.id));
    setPosts((prev) =>
      prev.map((p) => p.id === post.id ? { ...p, likeCount: p.likeCount + 1 } : p)
    );
    await fetch("/api/feed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: post.id, action: "like" }),
    });
  };

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-white/30">
        <Bot className="h-12 w-12 mb-4" />
        <p>No posts yet. Maya is creating content...</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-0.5">
        {posts.map((post, i) => (
          <motion.button
            key={post.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setSelected(post)}
            className="aspect-square relative overflow-hidden group"
          >
            {post.imageUrl ? (
              <Image
                src={post.imageUrl}
                alt={post.caption}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="33vw"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-cyber-pink/20 to-cyber-purple/20 flex items-center justify-center">
                <Bot className="h-8 w-8 text-white/20" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white text-sm">
              <span className="flex items-center gap-1">
                <Heart className="h-4 w-4" fill="white" /> {formatNumber(post.likeCount)}
              </span>
            </div>
            {post.isStory && (
              <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-cyber-pink text-white text-xs font-bold">
                STORY
              </div>
            )}
          </motion.button>
        ))}
      </div>

      {/* Post Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass rounded-2xl max-w-md w-full overflow-hidden border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              {selected.imageUrl && (
                <div className="relative aspect-square">
                  <Image src={selected.imageUrl} alt={selected.caption} fill className="object-cover" />
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-full glass text-xs text-cyber-pink flex items-center gap-1">
                    <Bot className="h-3 w-3" /> AI Generated
                  </div>
                </div>
              )}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyber-pink to-cyber-purple flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Maya</div>
                    <div className="text-xs text-white/40">{formatRelativeTime(selected.publishedAt)}</div>
                  </div>
                </div>
                <p className="text-sm text-white/80 mb-3">{selected.caption}</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {selected.hashtags.map((tag) => (
                    <span key={tag} className="text-xs text-cyber-blue">#{tag.replace(/^#/, "")}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                  <button
                    onClick={() => handleLike(selected)}
                    className="flex items-center gap-1.5 text-sm text-white/60 hover:text-cyber-pink transition-colors"
                  >
                    <Heart
                      className="h-4 w-4"
                      fill={likedIds.has(selected.id) ? "#ff2d78" : "none"}
                      stroke={likedIds.has(selected.id) ? "#ff2d78" : "currentColor"}
                    />
                    {formatNumber(selected.likeCount)}
                  </button>
                  {!isAuthenticated && (
                    <Button size="sm" asChild>
                      <Link href="/register">Join to chat →</Link>
                    </Button>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="absolute top-3 left-3 glass rounded-full p-1.5 text-white/60 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
