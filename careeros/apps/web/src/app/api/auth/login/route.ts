import { NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  isSupabaseAuthReady,
  isSupabaseConfigured,
  loginLocal,
  loginSupabase,
} from "@/lib/auth/session";

export async function POST(req: Request) {
  if (isSupabaseAuthReady()) {
    return NextResponse.json(
      { message: "Use Continue with Google. Email/password login is disabled." },
      { status: 400 },
    );
  }
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email || !password) {
      return NextResponse.json({ message: "Email and password required" }, { status: 400 });
    }

    const result = isSupabaseConfigured()
      ? await loginSupabase(email, password)
      : await loginLocal(email, password);

    const res = NextResponse.json(result);
    res.cookies.set(AUTH_COOKIE, result.access_token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Login failed" },
      { status: 401 },
    );
  }
}
