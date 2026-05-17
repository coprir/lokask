import { prisma } from "./prisma";
import { createEmbedding, cosineSimilarity } from "./openai";
import type { Memory } from "@/types";

export interface MemoryContext {
  userName?: string;
  relationship?: string;
  recentTopics: string[];
  userFacts: Record<string, string>;
  emotionalContext?: string;
}

export async function storeMemory(params: {
  userId: string;
  personaId: string;
  type: "core" | "episodic" | "semantic" | "working";
  key: string;
  value: string;
  importance?: number;
  ttlDays?: number;
}): Promise<void> {
  const embedding = await createEmbedding(`${params.key}: ${params.value}`);
  const expiresAt = params.ttlDays
    ? new Date(Date.now() + params.ttlDays * 24 * 60 * 60 * 1000)
    : undefined;

  await prisma.memory.upsert({
    where: {
      userId_personaId_type_key: {
        userId: params.userId,
        personaId: params.personaId,
        type: params.type,
        key: params.key,
      },
    },
    create: {
      userId: params.userId,
      personaId: params.personaId,
      type: params.type,
      key: params.key,
      value: params.value,
      importance: params.importance ?? 0.5,
      embedding,
      expiresAt,
    },
    update: {
      value: params.value,
      importance: params.importance ?? 0.5,
      embedding,
      expiresAt,
      updatedAt: new Date(),
    },
  });
}

export async function retrieveRelevantMemories(params: {
  userId: string;
  personaId: string;
  query: string;
  limit?: number;
}): Promise<Memory[]> {
  const queryEmbedding = await createEmbedding(params.query);
  const limit = params.limit ?? 10;

  const memories = await prisma.memory.findMany({
    where: {
      userId: params.userId,
      personaId: params.personaId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { importance: "desc" },
    take: 50,
  });

  const scored = memories
    .filter((m) => m.embedding.length > 0)
    .map((m) => ({
      ...m,
      score:
        cosineSimilarity(queryEmbedding, m.embedding) * 0.3 +
        m.importance * 0.4 +
        (m.lastAccessed
          ? Math.max(
              0,
              1 -
                (Date.now() - m.lastAccessed.getTime()) /
                  (30 * 24 * 60 * 60 * 1000)
            ) * 0.3
          : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const ids = scored.map((m) => m.id);
  await prisma.memory.updateMany({
    where: { id: { in: ids } },
    data: { lastAccessed: new Date(), accessCount: { increment: 1 } },
  });

  return scored as Memory[];
}

export async function buildMemoryContext(
  userId: string,
  personaId: string,
  currentMessage: string
): Promise<MemoryContext> {
  const [coreMemories, relevantMemories] = await Promise.all([
    prisma.memory.findMany({
      where: { userId, personaId, type: "core" },
    }),
    retrieveRelevantMemories({ userId, personaId, query: currentMessage }),
  ]);

  const coreMap = Object.fromEntries(coreMemories.map((m) => [m.key, m.value]));

  return {
    userName: coreMap["name"],
    relationship: coreMap["relationship_stage"],
    recentTopics: relevantMemories
      .filter((m) => m.type === "episodic")
      .map((m) => m.value)
      .slice(0, 5),
    userFacts: Object.fromEntries(
      coreMemories
        .filter((m) => m.key !== "name" && m.key !== "relationship_stage")
        .map((m) => [m.key, m.value])
    ),
    emotionalContext: relevantMemories.find((m) => m.key.startsWith("emotion"))
      ?.value,
  };
}

export async function extractAndStoreMemories(
  userId: string,
  personaId: string,
  messages: Array<{ role: string; content: string }>
): Promise<void> {
  const { openai } = await import("./openai");

  const extractionPrompt = `Analyze this conversation and extract important facts to remember about the user.
Return a JSON array of memories with shape: { key: string, value: string, type: "core"|"episodic"|"semantic", importance: number (0-1) }

Core = fundamental facts (name, age, location, job)
Episodic = specific events/conversations
Semantic = preferences, interests, patterns

Conversation:
${messages.map((m) => `${m.role}: ${m.content}`).join("\n")}

Return ONLY valid JSON array, no markdown.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: extractionPrompt }],
      temperature: 0,
      max_tokens: 500,
    });

    const content = response.choices[0].message.content?.trim() ?? "[]";
    const memories = JSON.parse(content) as Array<{
      key: string;
      value: string;
      type: "core" | "episodic" | "semantic";
      importance: number;
    }>;

    await Promise.all(
      memories.map((m) =>
        storeMemory({
          userId,
          personaId,
          type: m.type,
          key: m.key,
          value: m.value,
          importance: m.importance,
          ttlDays:
            m.type === "episodic" ? 90 : m.type === "semantic" ? 30 : undefined,
        })
      )
    );
  } catch {
    // Memory extraction is best-effort
  }
}
