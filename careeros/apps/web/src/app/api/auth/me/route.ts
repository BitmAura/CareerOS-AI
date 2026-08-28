import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/session";

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, plan: user.plan },
    access_token: user.token,
  });
}
