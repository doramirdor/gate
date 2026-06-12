import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme, term, BRAND } from "../theme";
import { SceneShell } from "../components/SceneShell";
import { TerminalWindow, Line } from "../components/Terminal";
import { PhoneFrame } from "../components/PhoneFrame";
import { Cursor, ClickRipple } from "../components/primitives";
import { GateMark } from "../components/GateLogo";

export const RequestApproval: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const outOp = interpolate(frame, [208, 220], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const lines: Line[] = [
    { at: 6, kind: "prompt", text: "user: book the Berlin hotel for the trip" },
    {
      at: 24,
      kind: "call",
      text: (
        <>
          <span style={{ color: term.accent }}>request_approval</span>(
        </>
      ),
    },
    { at: 32, kind: "json", indent: 1, text: 'action: "Book Hotel Adlon, 2 nights",' },
    {
      at: 40,
      kind: "json",
      indent: 1,
      text: (
        <>
          amount: <span style={{ color: term.danger }}>240</span>, currency:
          "EUR",
        </>
      ),
    },
    { at: 48, kind: "json", indent: 1, text: 'category: "travel")' },
    {
      at: 70,
      kind: "warn",
      text: "↳ 240 > $50 ceiling — no auto-approve rule matches",
    },
    {
      at: 84,
      kind: "muted",
      text: (
        <>
          status: <span style={{ color: term.accent }}>"pending"</span> · id
          a4f1 · ttl 15:00
        </>
      ),
    },
    { at: 100, kind: "muted", text: "→ pushing to amir…  (polling check_approval)" },
  ];

  // Phone slides in from fully off the right edge. Its resting left edge sits
  // at ~1235px, so it must travel >685px to clear the 1920 canvas — 780 hides
  // it completely (plus shadow) until the slide begins at scene-frame 60.
  const phoneIn = spring({
    frame: frame - 60,
    fps,
    config: { damping: 18, stiffness: 90 },
  });
  const phoneX = (1 - phoneIn) * 780;

  const approved = frame >= 150;
  // Tap location on the Approve button.
  const tapX = 1366;
  const tapY = 500;

  return (
    <SceneShell step="Step 5" title="Beyond the limit → it asks first">
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 70,
          opacity: outOp,
        }}
      >
        <TerminalWindow
          title={`agent · gated via ${BRAND.domain}/amir`}
          width={900}
          height={560}
          lines={lines}
        />

        <div style={{ transform: `translateX(${phoneX}px)` }}>
          <PhoneFrame>
            <div
              style={{
                padding: "70px 22px 22px",
                display: "flex",
                flexDirection: "column",
                height: "100%",
                fontFamily: theme.sans,
              }}
            >
              <div
                style={{
                  fontSize: 15,
                  color: theme.inkMuted,
                  textAlign: "center",
                  marginBottom: 16,
                  fontFamily: theme.mono,
                }}
              >
                Telegram · Gate bot
              </div>

              {/* push card */}
              <div
                style={{
                  background: theme.surface,
                  border: `1px solid ${theme.line}`,
                  borderRadius: 22,
                  padding: 22,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
                >
                  <GateMark size={26} color={theme.accent} />
                  <span
                    style={{
                      fontWeight: 600,
                      color: theme.ink,
                      fontSize: 19,
                    }}
                  >
                    Approval needed
                  </span>
                </div>
                <div
                  style={{ fontSize: 21, color: theme.ink, lineHeight: 1.35 }}
                >
                  Your agent wants to book{" "}
                  <b>Hotel Adlon, 2 nights</b>.
                </div>
                <div
                  style={{
                    fontFamily: theme.mono,
                    fontSize: 30,
                    fontWeight: 600,
                    color: theme.accent,
                  }}
                >
                  €240.00
                </div>
                <div
                  style={{
                    fontSize: 15,
                    color: theme.inkMuted,
                    fontFamily: theme.mono,
                  }}
                >
                  travel · expires in 15:00
                </div>

                {/* buttons */}
                <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                  <button
                    style={{
                      flex: 1,
                      height: 60,
                      borderRadius: 14,
                      border: "none",
                      background: approved ? theme.success : `${theme.success}1f`,
                      color: approved ? "#ffffff" : theme.success,
                      fontSize: 20,
                      fontWeight: 700,
                      fontFamily: theme.sans,
                    }}
                  >
                    {approved ? "Approved ✓" : "Approve"}
                  </button>
                  <button
                    style={{
                      flex: 1,
                      height: 60,
                      borderRadius: 14,
                      border: `1px solid ${theme.line}`,
                      background: theme.surface2,
                      color: theme.inkMuted,
                      fontSize: 20,
                      fontWeight: 600,
                      fontFamily: theme.sans,
                      opacity: approved ? 0.4 : 1,
                    }}
                  >
                    Deny
                  </button>
                </div>
                <div
                  style={{
                    fontSize: 15,
                    color: theme.inkMuted,
                    textAlign: "center",
                    marginTop: 2,
                  }}
                >
                  or tap “Always allow travel”
                </div>
              </div>
            </div>
          </PhoneFrame>
        </div>
      </div>

      {/* finger tap on approve */}
      {frame >= 132 && frame <= 175 && (
        <Cursor
          path={[
            { x: tapX + 120, y: tapY + 160, at: 132 },
            { x: tapX, y: tapY, at: 148, click: true },
            { x: tapX, y: tapY, at: 175 },
          ]}
        />
      )}
      <ClickRipple x={tapX} y={tapY} at={150} />
    </SceneShell>
  );
};
