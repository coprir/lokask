import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_ROUTES = ["/chat", "/dashboard"];
const AUTH_ROUTES = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await auth();

  if (PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
    if (!session?.user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  if (AUTH_ROUTES.includes(pathname) && session?.user) {
    return NextResponse.redirect(new URL("/chat", request.url));
  }

  // Add AI disclosure header
  const response = NextResponse.next();
  response.headers.set("X-AI-Disclosure", "Maya is an AI virtual influencer");
  response.headers.set("X-Content-Policy", "AI-Generated Content");

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
