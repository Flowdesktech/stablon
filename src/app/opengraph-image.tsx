import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

export const alt = siteConfig.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "radial-gradient(1000px 600px at 20% 0%, rgba(168,85,247,0.25), transparent), radial-gradient(800px 500px at 100% 100%, rgba(59,130,246,0.2), transparent), #0a0a0f",
          padding: 80,
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)",
              fontSize: 44,
              fontWeight: 700,
            }}
          >
            S
          </div>
          <div style={{ fontSize: 40, fontWeight: 700 }}>Stablon</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0 20px",
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.05,
              maxWidth: 900,
            }}
          >
            <span>One app.</span>
            <span>One card.</span>
            <span
              style={{
                backgroundImage: "linear-gradient(90deg, #c084fc, #60a5fa)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Everything money.
            </span>
          </div>
          <div style={{ fontSize: 34, color: "rgba(255,255,255,0.65)", maxWidth: 940 }}>
            Global USD & EUR accounts, a stablecoin Visa card, instant swaps, and up to 5% APY.
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {["USD & EUR accounts", "Visa card", "0% fees", "160+ countries"].map((tag) => (
            <div
              key={tag}
              style={{
                display: "flex",
                fontSize: 26,
                padding: "10px 22px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.8)",
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
