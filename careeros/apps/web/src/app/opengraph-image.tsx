import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "CareerOS AI — Assisted Career Operating System for India";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "linear-gradient(165deg, #ebe6dc 0%, #f3f1ec 40%, #1a2330 100%)",
          color: "#12161c",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: -2 }}>CareerOS</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 900 }}>
          <div style={{ fontSize: 36, fontWeight: 600, color: "#f3f1ec" }}>
            Resume · ATS-style readiness · Graded jobs · Confirm apply
          </div>
          <div style={{ fontSize: 24, color: "#c45c26" }}>
            One career OS for India — not five tabs and Easy Apply spam
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
