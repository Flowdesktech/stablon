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
          background: "#f6f8fa",
          padding: 80,
          color: "#1f2328",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#0969da",
              color: "#ffffff",
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
            <span>Business payments.</span>
            <span style={{ color: "#0969da" }}>Professional invoicing.</span>
          </div>
          <div style={{ fontSize: 34, color: "#59636e", maxWidth: 940 }}>
            Manage supported money accounts, bank and stablecoin workflows, invoices, and payment tracking.
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {["Money accounts", "Bank payments", "Stablecoin routes", "Invoice PDFs"].map((tag) => (
            <div
              key={tag}
              style={{
                display: "flex",
                fontSize: 26,
                padding: "10px 22px",
                borderRadius: 999,
                border: "1px solid #d8dee4",
                background: "#ffffff",
                color: "#59636e",
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
