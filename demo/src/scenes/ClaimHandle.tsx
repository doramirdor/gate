import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { theme, BRAND } from "../theme";
import { SceneShell } from "../components/SceneShell";
import {
  BrowserChrome,
  Cursor,
  ClickRipple,
  Caret,
  useTyped,
} from "../components/primitives";

export const ClaimHandle: React.FC = () => {
  const frame = useCurrentFrame();
  const typed = useTyped("amir", 30, 0.55);
  const available = frame > 64;
  const claimed = frame > 96;

  // Card geometry (centered).
  const cardW = 760;
  const cardLeft = (1920 - cardW) / 2;
  const inputTop = 552;
  const btnTop = 648;

  return (
    <SceneShell step="Step 1" title="Claim your handle">
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <BrowserChrome url={`${BRAND.domain}/start`} width={cardW} height={520}>
          <div
            style={{
              padding: "52px 64px",
              display: "flex",
              flexDirection: "column",
              gap: 22,
            }}
          >
            <div
              style={{ fontSize: 38, fontWeight: 600, color: theme.ink }}
            >
              Claim your gate
            </div>
            <div style={{ fontSize: 20, color: theme.inkMuted }}>
              Pick a handle. Agents reach you at this address.
            </div>

            {/* input */}
            <div
              style={{
                marginTop: 14,
                height: 70,
                background: theme.surface2,
                border: `2px solid ${
                  claimed ? theme.success : available ? theme.success : theme.line
                }`,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                padding: "0 22px",
                fontFamily: theme.mono,
                fontSize: 26,
                gap: 2,
              }}
            >
              <span style={{ color: theme.inkMuted }}>{BRAND.domain}/</span>
              <span style={{ color: theme.ink }}>{typed}</span>
              {!available && <Caret color={theme.accent} />}
              <div style={{ flex: 1 }} />
              {available && (
                <span
                  style={{
                    color: theme.success,
                    fontSize: 18,
                    fontFamily: theme.sans,
                    fontWeight: 500,
                  }}
                >
                  available ✓
                </span>
              )}
            </div>

            {/* button */}
            <div
              style={{
                marginTop: 8,
                height: 64,
                borderRadius: 12,
                background: claimed ? theme.success : theme.accent,
                color: claimed ? "#ffffff" : "#1a1206",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                fontWeight: 600,
                transition: "none",
              }}
            >
              {claimed ? "Handle claimed — building your profile…" : "Claim handle →"}
            </div>
          </div>
        </BrowserChrome>
      </div>

      <Cursor
        path={[
          { x: 1400, y: 900, at: 0 },
          { x: cardLeft + 380, y: inputTop, at: 20, click: true },
          { x: cardLeft + 380, y: inputTop, at: 60 },
          { x: cardLeft + 380, y: btnTop, at: 90, click: true },
          { x: cardLeft + 380, y: btnTop, at: 130 },
        ]}
      />
      <ClickRipple x={cardLeft + 380} y={btnTop} at={90} />
    </SceneShell>
  );
};
