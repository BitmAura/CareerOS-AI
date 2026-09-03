import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { message: "Use Email me a magic link on /register. Email/password signup is disabled." },
    { status: 400 },
  );
}
