"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bot, Github, Mail, Loader2 } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSignIn = async (provider: string) => {
    setLoading(provider);
    await signIn(provider, { callbackUrl: "/chat" });
  };

  return (
    <div className="min-h-screen bg-cyber-darker flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-cyber-grid bg-cyber-grid opacity-20" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyber-pink/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyber-purple/5 rounded-full blur-3xl" />

      <div className="relative glass rounded-3xl p-8 w-full max-w-md border border-white/10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyber-pink to-cyber-purple flex items-center justify-center mx-auto mb-4 animate-glow">
            <Bot className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-2">Welcome Back</h1>
          <p className="text-white/40 text-sm">Sign in to chat with Maya</p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => handleSignIn("google")}
            disabled={!!loading}
            variant="outline"
            className="w-full"
          >
            {loading === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Continue with Google
          </Button>

          <Button
            onClick={() => handleSignIn("github")}
            disabled={!!loading}
            variant="outline"
            className="w-full"
          >
            {loading === "github" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />}
            Continue with GitHub
          </Button>
        </div>

        <div className="mt-8 p-4 rounded-xl bg-cyber-pink/5 border border-cyber-pink/10">
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Bot className="h-3.5 w-3.5 text-cyber-pink" />
            <span>By signing in, you acknowledge that <strong className="text-cyber-pink">Maya is an AI</strong>, not a real person.</span>
          </div>
        </div>

        <p className="text-center text-xs text-white/30 mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-cyber-pink hover:underline">Sign up free</Link>
        </p>
      </div>
    </div>
  );
}
