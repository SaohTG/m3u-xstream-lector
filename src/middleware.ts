import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccess } from "./lib/jwt";
import { parse } from "cookie";

const PROTECTED_PREFIXES = ["/movies","/series","/live","/my-list","/settings","/onboarding","/api/xtream","/api/tmdb"];

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  // Protect pages & APIs
  if (PROTECTED_PREFIXES.some(p => url.pathname.startsWith(p))) {
    try {
      const cookies = req.headers.get("cookie") || "";
      const map = parse(cookies || "");
      const token = map["nova_access"];
      if (!token) throw new Error("no token");
      await verifyAccess(token);
      // ok
      return NextResponse.next();
    } catch (e) {
      // Redirect to login for pages, 401 for API
      if (url.pathname.startsWith("/api/")) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }
      const login = new URL("/auth/login", req.url);
      return NextResponse.redirect(login);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|api/auth).*)"],
};
