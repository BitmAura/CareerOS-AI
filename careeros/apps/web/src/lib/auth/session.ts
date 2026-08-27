import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { AUTH_COOKIE } from "@/lib/auth/keys";
import { localStore } from "@/lib/db/local-store";
import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { UserRecord } from "@/lib/db/types";

const COOKIE = AUTH_COOKIE;

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET must be set in production");
    }
    return new TextEncoder().encode("careeros-dev-secret-change-me");
  }
  return new TextEncoder().encode(value);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function signToken(user: { id: string; email: string }) {
  return new SignJWT({ email: user.email, sub: user.id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRY || "7d")
    .sign(secret());
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, secret());
  return { userId: String(payload.sub), email: String(payload.email || "") };
}

export function toPublicUser(user: UserRecord) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan || "starter",
    avatarUrl: user.avatarUrl,
  };
}

export async function registerLocal(email: string, password: string, name: string) {
  const passwordHash = await hashPassword(password);
  const user = await localStore.createUser({ email, name, passwordHash });
  const access_token = await signToken(user);
  return { access_token, user: toPublicUser(user) };
}

export async function loginLocal(email: string, password: string) {
  const user = await localStore.findUserByEmail(email);
  if (!user?.passwordHash) throw new Error("Invalid credentials");
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw new Error("Invalid credentials");
  const access_token = await signToken(user);
  return { access_token, user: toPublicUser(user) };
}

export async function registerSupabase(email: string, password: string, name: string) {
  const sb = getServiceSupabase();
  if (!sb) throw new Error("Supabase not configured");
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error || !data.user) throw new Error(error?.message || "Registration failed");

  await sb.from("profiles").upsert({
    id: data.user.id,
    email,
    name,
    plan: "starter",
  });

  const { data: sessionData, error: signErr } = await sb.auth.signInWithPassword({ email, password });
  if (signErr || !sessionData.session) throw new Error(signErr?.message || "Login after register failed");

  return {
    access_token: sessionData.session.access_token,
    user: { id: data.user.id, email, name, plan: "starter" as const },
  };
}

export async function loginSupabase(email: string, password: string) {
  const sb = getServiceSupabase();
  if (!sb) throw new Error("Supabase not configured");
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) throw new Error(error?.message || "Invalid credentials");

  const { data: profile } = await sb.from("profiles").select("*").eq("id", data.user.id).maybeSingle();

  return {
    access_token: data.session.access_token,
    user: {
      id: data.user.id,
      email: data.user.email || email,
      name: profile?.name || (data.user.user_metadata?.name as string) || email.split("@")[0],
      plan: profile?.plan || "starter",
      avatarUrl: profile?.avatar_url || undefined,
    },
  };
}

export async function getAuthUser(req: Request) {
  const header = req.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(COOKIE)?.value;
  const token = bearer || cookieToken;
  if (!token) return null;

  if (isSupabaseConfigured()) {
    const sb = getServiceSupabase()!;
    const { data, error } = await sb.auth.getUser(token);
    if (!error && data.user) {
      const { data: profile } = await sb.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
      return {
        id: data.user.id,
        email: data.user.email || "",
        name: profile?.name || (data.user.user_metadata?.name as string) || "User",
        plan: profile?.plan || "starter",
        token,
      };
    }
  }

  try {
    const payload = await verifyToken(token);
    const user = await localStore.findUserById(payload.userId);
    if (!user) return null;
    return { id: user.id, email: user.email, name: user.name, plan: user.plan, token };
  } catch {
    return null;
  }
}

export { COOKIE, COOKIE as AUTH_COOKIE, isSupabaseConfigured };
