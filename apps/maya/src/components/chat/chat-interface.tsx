"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Mic, Image, Lock, Bot, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRelativeTime, generateTypingDelay, sleep } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import type { AiPersona, Message, Subscription, User } from "@/types";

interface Props {
  persona: AiPersona;
  user: User;
  subscription: Subscription | null;
}

const MOOD_COLORS: Record<string, string> = {
  HAPPY: "text-yellow-400",
  EXCITED: "text-orange-400",
  CHILL: "text-blue-400",
  FLIRTY: "text-pink-400",
  MYSTERIOUS: "text-purple-400",
  THOUGHTFUL: "text-indigo-400",
  ENERGETIC: "text-green-400",
  MELANCHOLY: "text-slate-400",
};

const MOOD_EMOJI: Record<string, string> = {
  HAPPY: "😊", EXCITED: "🤩", CHILL: "😎", FLIRTY: "😏",
  MYSTERIOUS: "🔮", THOUGHTFUL: "🤔", ENERGETIC: "⚡", MELANCHOLY: "🌧️",
};

export function ChatInterface({ persona, user, subscription }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentMood, setCurrentMood] = useState(persona.currentMood);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const quotaUsed = subscription?.messagesUsed ?? 0;
  const quotaTotal = subscription?.monthlyMessageQuota ?? 20;
  const quotaRemaining = quotaTotal - quotaUsed;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    setInput("");
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      sessionId: sessionId ?? "",
      userId: user.id,
      role: "USER",
      content: text,
      tokens: 0,
      isRead: true,
      isPremium: false,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setIsTyping(true);

    try {
      const typingDelay = generateTypingDelay(text);
      await sleep(typingDelay);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: text, personaId: persona.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
        return;
      }

      if (!sessionId) setSessionId(data.data.message.sessionId);
      setCurrentMood(data.data.persona.currentMood);
      setMessages((prev) => [...prev, data.data.message]);
    } catch {
      toast({ title: "Network error", description: "Could not send message", variant: "destructive" });
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  }, [input, isTyping, sessionId, persona.id, user.id]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleVoice = async (messageContent: string) => {
    if (!subscription?.voiceEnabled) {
      toast({ title: "Voice locked", description: "Upgrade to unlock voice messages 🎙️" });
      return;
    }
    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: messageContent, personaId: persona.id }),
      });
      const data = await res.json();
      if (data.success) {
        const audio = new Audio(data.data.audioUrl);
        audio.play();
      }
    } catch {
      toast({ title: "Voice failed", description: "Could not generate voice message", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-cyber-darker">
      {/* Header */}
      <div className="glass border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-white/50 hover:text-white transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>

        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyber-pink to-cyber-purple flex items-center justify-center">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-cyber-darker animate-pulse" />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">{persona.name}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyber-pink/20 text-cyber-pink font-mono">
              AI
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-white/40">
            <span className={MOOD_COLORS[currentMood]}>{MOOD_EMOJI[currentMood]}</span>
            <span>{currentMood.charAt(0) + currentMood.slice(1).toLowerCase()} mood</span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-white/40">Messages</div>
          <div className={`text-sm font-mono ${quotaRemaining <= 5 ? "text-red-400" : "text-white/70"}`}>
            {quotaRemaining}/{quotaTotal}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyber-pink/30 to-cyber-purple/30 flex items-center justify-center mx-auto mb-4 animate-glow">
              <Bot className="h-10 w-10 text-cyber-pink" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Hey, I&apos;m {persona.name} 👾</h3>
            <p className="text-white/50 text-sm max-w-xs mx-auto">{persona.tagline}</p>
            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyber-pink/10 text-cyber-pink text-xs">
              <Bot className="h-3 w-3" /> AI Virtual Influencer — Not a real person
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              persona={persona}
              onVoice={handleVoice}
              voiceEnabled={subscription?.voiceEnabled ?? false}
            />
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-end gap-2"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyber-pink to-cyber-purple flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="glass rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-cyber-pink rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="glass border-t border-white/5 px-4 py-3">
        {quotaRemaining === 0 && (
          <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center gap-2">
            <Lock className="h-3.5 w-3.5" />
            Monthly quota reached.{" "}
            <Link href="/pricing" className="underline hover:text-amber-300">
              Upgrade for more messages →
            </Link>
          </div>
        )}
        <div className="flex items-end gap-2">
          <div className="flex-1 glass rounded-2xl border border-white/10 focus-within:border-cyber-pink/50 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${persona.name}...`}
              rows={1}
              disabled={quotaRemaining === 0 || isTyping}
              className="w-full bg-transparent px-4 py-3 text-sm text-white placeholder-white/30 resize-none focus:outline-none max-h-32 min-h-[44px]"
              style={{ height: "auto" }}
            />
          </div>
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isTyping || quotaRemaining === 0}
            size="icon"
            className="rounded-2xl h-11 w-11 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-center text-xs text-white/20 mt-2">
          Maya is AI · All conversations are with artificial intelligence
        </p>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  persona,
  onVoice,
  voiceEnabled,
}: {
  message: Message;
  persona: AiPersona;
  onVoice: (text: string) => void;
  voiceEnabled: boolean;
}) {
  const isAI = message.role === "ASSISTANT";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-end gap-2 ${isAI ? "" : "flex-row-reverse"}`}
    >
      {isAI && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyber-pink to-cyber-purple flex items-center justify-center shrink-0">
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}
      <div className={`max-w-[75%] group ${isAI ? "" : "items-end flex flex-col"}`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isAI
              ? "glass rounded-bl-sm border border-white/5 text-white"
              : "bg-gradient-to-br from-cyber-pink to-cyber-purple text-white rounded-br-sm"
          }`}
        >
          {message.content}
        </div>
        <div className={`flex items-center gap-2 mt-1 ${isAI ? "" : "flex-row-reverse"}`}>
          <span className="text-xs text-white/20">
            {formatRelativeTime(message.createdAt)}
          </span>
          {isAI && (
            <button
              onClick={() => onVoice(message.content)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              title={voiceEnabled ? "Play voice" : "Upgrade to unlock voice"}
            >
              {voiceEnabled ? (
                <Mic className="h-3 w-3 text-cyber-pink" />
              ) : (
                <Lock className="h-3 w-3 text-white/30" />
              )}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
