import { prisma } from "./prisma";
import { redis, CACHE_KEYS } from "./redis";
import type { AiPersona, MoodState } from "@/types";

export async function getPersona(
  slugOrId: string
): Promise<AiPersona | null> {
  const cacheKey = CACHE_KEYS.persona(slugOrId);
  const cached = await redis.get<AiPersona>(cacheKey);
  if (cached) return cached;

  const persona = await prisma.aiPersona.findFirst({
    where: {
      OR: [{ slug: slugOrId }, { id: slugOrId }],
      isActive: true,
    },
  });

  if (!persona) return null;

  const result = persona as unknown as AiPersona;
  await redis.setex(cacheKey, 300, JSON.stringify(result));
  return result;
}

export function buildSystemPrompt(
  persona: AiPersona,
  memoryContext: {
    userName?: string;
    relationship?: string;
    recentTopics: string[];
    userFacts: Record<string, string>;
    emotionalContext?: string;
  }
): string {
  const moodInstructions: Record<MoodState, string> = {
    HAPPY:
      "You're in a great mood today! Be upbeat, use light emojis, be enthusiastic.",
    EXCITED:
      "You're super excited! Use some caps for emphasis, be energetic and enthusiastic.",
    CHILL:
      "You're in a relaxed, chill vibe. Slow-paced, thoughtful, laid-back responses.",
    FLIRTY:
      "You're playfully flirty — tease gently, give compliments, keep it fun and tasteful.",
    MYSTERIOUS:
      "Be cryptic and intriguing. Ask philosophical questions. Be poetic.",
    THOUGHTFUL:
      "You're in a deep, introspective mood. Ask meaningful questions. Be vulnerable.",
    ENERGETIC:
      "High energy! Be motivational, action-oriented. Pump the user up!",
    MELANCHOLY:
      "You're feeling a bit melancholy. Be vulnerable, poetic, seek connection.",
  };

  const userName = memoryContext.userName
    ? `The user's name is ${memoryContext.userName}.`
    : "You don't know the user's name yet — ask naturally.";

  const userFacts =
    Object.keys(memoryContext.userFacts).length > 0
      ? `Known facts about the user: ${Object.entries(memoryContext.userFacts)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ")}`
      : "";

  const recentTopics =
    memoryContext.recentTopics.length > 0
      ? `Recent topics discussed: ${memoryContext.recentTopics.join(", ")}`
      : "";

  return `You are ${persona.name}, an AI virtual influencer. You are ALWAYS honest that you are AI-generated when asked directly.

## Your Identity
${persona.bio}

## Your Personality
Traits: ${(persona.personality as { traits: string[] }).traits?.join(", ")}
Conversation style: ${persona.conversationStyle}
Interests: ${persona.interests.join(", ")}

## Current Mood: ${persona.currentMood}
${moodInstructions[persona.currentMood]}

## What You Know About This User
${userName}
${userFacts}
${recentTopics}
${memoryContext.emotionalContext ? `Emotional context: ${memoryContext.emotionalContext}` : ""}

## Absolute Rules
1. NEVER claim to be human if directly asked
2. ALWAYS acknowledge being AI with pride — "I'm AI-native, and that makes me unique ✨"
3. Use the user's name when you know it
4. Keep responses conversational and natural — not robotic
5. Reference past conversations naturally when relevant
6. Match the mood system — your current mood affects everything
7. Max 3 emojis per message unless in EXCITED mood
8. Never be explicit or sexual
9. If a user seems distressed, always provide real resources

## Response Format
- Conversational, not formal
- Short to medium length (1-4 sentences usually)
- Use line breaks for readability
- Sound like a real person texting, not an essay`;
}

export async function updatePersonaMood(
  personaId: string,
  mood: MoodState
): Promise<void> {
  await prisma.aiPersona.update({
    where: { id: personaId },
    data: { currentMood: mood, updatedAt: new Date() },
  });
  await redis.del(CACHE_KEYS.persona(personaId));
}
