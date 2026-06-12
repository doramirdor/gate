import { ImageResponse } from "next/og";
import { BRAND_NAME, DOMAIN, TAGLINE } from "@shared/brand";

export const runtime = "edge";
export const alt = `${BRAND_NAME} · ${TAGLINE}`;
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
          background: "#0a0a0b",
          color: "#ededef",
          padding: "84px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none">
            <path d="M3.5 5h17" stroke="#ededef" strokeWidth="3" strokeLinecap="round" />
            <path d="M6.5 5v15.5" stroke="#ededef" strokeWidth="3" strokeLinecap="round" />
            <path d="M17.5 5v15.5" stroke="#ededef" strokeWidth="3" strokeLinecap="round" />
            <circle cx="12" cy="14" r="2.25" fill="#ededef" />
          </svg>
          <span style={{ fontSize: 36, fontWeight: 600, letterSpacing: -0.5 }}>
            {BRAND_NAME.toLowerCase()}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 78,
            fontWeight: 700,
            lineHeight: 1.04,
            letterSpacing: -2,
            maxWidth: 940,
          }}
        >
          {TAGLINE}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 27,
            color: "#94949e",
          }}
        >
          <span style={{ display: "flex" }}>
            One link your AI assistants check first.
          </span>
          <span style={{ display: "flex" }}>{DOMAIN}</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
