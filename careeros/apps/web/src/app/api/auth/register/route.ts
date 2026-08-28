import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { message: "Use Continue with Google. Email/password signup is disabled." },
    { status: 400 },
  );
}
