"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bot, Github, Mail, Loader2, Check } from "lucide-react";
import Link from "next/link";

const BENEFITS = [
  "Chat with Maya powered by GPT-4o",
  "Maya remembers your conversations",
  "20 free messages every month",
  "Access to Maya's AI-generated feed",
];

export default function RegisterPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSignIn = async (provider: string) => {
    setLoading(provider);
    await signIn(provider, { callbackUrl: "/chat" });
  };

  return (
    <div className="min-h-screen bg-cyber-darker flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-cyber-grid bg-cyber-grid opacity-20" />

      <div className="relative glass rounded-3xl p-8 w-full max-w-md border border-white/10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyber-pink to-cyber-purple flex items-center justify-center mx-auto mb-4 animate-glow">
            <Bot className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-2">Join Maya&apos;s World</h1>
          <p className="text-white/40 text-sm">Create your free account</p>
        </div>

        <ul className="space-y-2 mb-8">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-center gap-2 text-sm text-white/60">
              <Check className="h-3.5 w-3.5 text-cyber-pink shrink-0" />
              {b}
            </li>
          ))}
        </ul>

        <div className="space-y-3">
          <Button onClick={() => handleSignIn("google")} disabled={!!loading} variant="outline" className="w-full">
            {loading === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Continue with Google
          </Button>
          <Button onClick={() => handleSignIn("github")} disabled={!!loading} variant="outline" className="w-full">
            {loading === "github" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />}
            Continue with GitHub
          </Button>
        </div>

        <div className="mt-6 p-4 rounded-xl bg-cyber-pink/5 border border-cyber-pink/10">
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Bot className="h-3.5 w-3.5 text-cyber-pink" />
            <span>
              <strong className="text-cyber-pink">AI Disclosure:</strong> Maya is a 100%
              AI-generated virtual influencer. You are interacting with artificial
              intelligence, not a real person.
            </span>
          </div>
        </div>

        <p className="text-center text-xs text-white/30 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-cyber-pink hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
