import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/session";
import { isBlockedDiscoveryHost } from "@/lib/jobs/live-discover";
import { probeJobUrlLiveness } from "@/lib/jobs/legitimacy";

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const url = String(body.url || "").trim();
  if (!url) return NextResponse.json({ message: "url required" }, { status: 400 });
  if (isBlockedDiscoveryHost(url)) {
    return NextResponse.json({
      live: false,
      checked: true,
      blocked: true,
      message: "LinkedIn/Naukri login walls are not probed — paste the JD instead.",
    });
  }
  const probe = await probeJobUrlLiveness(url);
  return NextResponse.json({
    ...probe,
    message: probe.checked
      ? probe.live
        ? "Posting looks live — open the employer site and you submit."
        : "This posting may be closed. Confirm on the careers page before spending a packet."
      : "Could not verify (network). Open the employer site and check yourself.",
  });
}
