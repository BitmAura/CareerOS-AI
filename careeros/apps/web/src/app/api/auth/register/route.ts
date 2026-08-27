import { NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  isSupabaseConfigured,
  registerLocal,
  registerSupabase,
} from "@/lib/auth/session";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const name = String(body.name || "").trim();

    if (!email || !password || password.length < 6 || name.length < 2) {
      return NextResponse.json({ message: "Invalid registration data" }, { status: 400 });
    }

    const result = isSupabaseConfigured()
      ? await registerSupabase(email, password, name)
      : await registerLocal(email, password, name);

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
      { message: e instanceof Error ? e.message : "Registration failed" },
      { status: 409 },
    );
  }
}
