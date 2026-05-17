export type SubscriptionTier = "FREE" | "BASIC" | "PREMIUM" | "VIP";
export type SubscriptionStatus = "ACTIVE" | "CANCELED" | "PAST_DUE" | "TRIALING" | "INCOMPLETE";
export type MessageRole = "USER" | "ASSISTANT" | "SYSTEM";
export type ContentType = "IMAGE" | "VOICE" | "TEXT_POST" | "STORY";
export type MoodState = "HAPPY" | "EXCITED" | "CHILL" | "FLIRTY" | "MYSTERIOUS" | "THOUGHTFUL" | "ENERGETIC" | "MELANCHOLY";
export type SafetyAction = "WARN" | "BLOCK" | "REPORT" | "BAN";

export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  timezone: string;
  preferredLanguage: string;
  engagementScore: number;
  fanTier: number;
  totalMessages: number;
  lastActiveAt?: Date;
  onboardingDone: boolean;
  subscription?: Subscription;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  monthlyMessageQuota: number;
  messagesUsed: number;
  voiceEnabled: boolean;
  exclusiveContent: boolean;
}

export interface AiPersona {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  bio: string;
  age: number;
  location: string;
  avatarUrl?: string;
  coverUrl?: string;
  personality: PersonalityConfig;
  interests: string[];
  conversationStyle: string;
  currentMood: MoodState;
  voiceId?: string;
  voicePreset?: string;
  isActive: boolean;
  isVerified: boolean;
  followerCount: number;
  postCount: number;
  responseDelay: number;
  typingSpeed: number;
}

export interface PersonalityConfig {
  traits: string[];
  tone: string;
  emojiUsage: "heavy" | "moderate" | "light" | "none";
  humor: "dry" | "playful" | "wholesome" | "dark";
  vocabulary: "formal" | "casual" | "internet" | "poetic";
  responseLength: "short" | "medium" | "long" | "adaptive";
}

export interface Memory {
  id: string;
  userId: string;
  personaId: string;
  type: "core" | "episodic" | "semantic" | "working";
  key: string;
  value: string;
  importance: number;
  embedding?: number[];
  accessCount: number;
  lastAccessed?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

export interface ChatSession {
  id: string;
  userId: string;
  personaId: string;
  title?: string;
  isActive: boolean;
  messageCount: number;
  lastMessageAt?: Date;
  moodAtStart: MoodState;
  createdAt: Date;
  persona?: AiPersona;
  messages?: Message[];
}

export interface Message {
  id: string;
  sessionId: string;
  userId: string;
  role: MessageRole;
  content: string;
  audioUrl?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
  tokens: number;
  isRead: boolean;
  isPremium: boolean;
  createdAt: Date;
}

export interface FeedPost {
  id: string;
  personaId: string;
  imageUrl: string;
  caption: string;
  hashtags: string[];
  likeCount: number;
  commentCount: number;
  viewCount: number;
  isStory: boolean;
  expiresAt?: Date;
  publishedAt: Date;
  persona?: AiPersona;
  comments?: FeedComment[];
}

export interface FeedComment {
  id: string;
  postId: string;
  userId?: string;
  isAi: boolean;
  content: string;
  createdAt: Date;
}

export interface GeneratedContent {
  id: string;
  personaId: string;
  type: ContentType;
  prompt: string;
  imageUrl?: string;
  audioUrl?: string;
  textContent?: string;
  style?: string;
  isPublished: boolean;
  publishedAt?: Date;
  likeCount: number;
  viewCount: number;
  createdAt: Date;
}

export interface SafetyLog {
  id: string;
  userId?: string;
  action: SafetyAction;
  reason: string;
  content?: string;
  resolved: boolean;
  createdAt: Date;
}

export interface AnalyticsEvent {
  id: string;
  userId?: string;
  event: string;
  properties?: Record<string, unknown>;
  sessionId?: string;
  createdAt: Date;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalMessages: number;
  avgEngagementScore: number;
  subscriptionBreakdown: Record<SubscriptionTier, number>;
  topFans: User[];
}

export interface ChatCompletionRequest {
  sessionId: string;
  message: string;
  personaId: string;
}

export interface ChatCompletionResponse {
  message: Message;
  persona: Pick<AiPersona, "id" | "name" | "currentMood">;
  memoryUpdated: boolean;
}

export interface VoiceGenerationRequest {
  text: string;
  personaId: string;
  preset?: string;
}

export interface ImageGenerationRequest {
  personaId: string;
  type: "selfie" | "gym" | "lifestyle" | "aesthetic" | "custom";
  style?: string;
  customPrompt?: string;
}

export interface StripeSubscriptionPlan {
  id: string;
  name: string;
  tier: SubscriptionTier;
  price: number;
  priceId: string;
  features: string[];
  messageQuota: number;
  voiceEnabled: boolean;
  exclusiveContent: boolean;
}

export interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
  type: "message" | "post" | "voice" | "system" | "subscription";
  metadata?: Record<string, unknown>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
