import { prisma } from "./prisma";
import { moderateContent } from "./openai";
import type { SafetyAction } from "@/types";

const BLOCKED_PATTERNS = [
  /\b(meet\s+up|come\s+over|my\s+address|your\s+address)\b/i,
  /\b(send\s+me\s+money|venmo|cashapp|paypal\s+me)\b/i,
  /\b(real\s+phone|your\s+number|call\s+me)\b/i,
];

const WARN_PATTERNS = [
  /\b(are\s+you\s+real|are\s+you\s+human|real\s+person)\b/i,
  /\b(i\s+love\s+you|marry\s+me|be\s+my\s+girlfriend)\b/i,
];

export interface SafetyCheckResult {
  allowed: boolean;
  action?: SafetyAction;
  reason?: string;
  warningMessage?: string;
}

export async function checkContentSafety(
  content: string,
  userId?: string,
  ipAddress?: string
): Promise<SafetyCheckResult> {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(content)) {
      await logSafetyEvent({
        userId,
        action: "BLOCK",
        reason: "Blocked pattern detected",
        content,
        ipAddress,
      });
      return {
        allowed: false,
        action: "BLOCK",
        reason: "This type of content is not allowed.",
      };
    }
  }

  for (const pattern of WARN_PATTERNS) {
    if (pattern.test(content)) {
      return {
        allowed: true,
        action: "WARN",
        reason: "Sensitive topic detected",
        warningMessage:
          "Remember: Maya is an AI virtual influencer, not a real person.",
      };
    }
  }

  if (process.env.NSFW_FILTER_ENABLED === "true") {
    const moderation = await moderateContent(content);
    if (moderation.flagged) {
      await logSafetyEvent({
        userId,
        action: "BLOCK",
        reason: "Content flagged by moderation",
        content,
        ipAddress,
      });
      return {
        allowed: false,
        action: "BLOCK",
        reason: "This content violates our community guidelines.",
      };
    }
  }

  return { allowed: true };
}

export async function logSafetyEvent(params: {
  userId?: string;
  action: SafetyAction;
  reason: string;
  content?: string;
  ipAddress?: string;
}): Promise<void> {
  await prisma.safetyLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      reason: params.reason,
      content: params.content?.slice(0, 500),
      ipAddress: params.ipAddress,
    },
  });
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const { redis } = await import("./redis");
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, windowSeconds);
  const ttl = await redis.ttl(key);
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt: Date.now() + ttl * 1000,
  };
}
