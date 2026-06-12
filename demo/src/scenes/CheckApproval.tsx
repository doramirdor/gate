import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { theme, BRAND } from "../theme";
import { SceneShell } from "../components/SceneShell";
import { TerminalWindow, Line } from "../components/Terminal";
import { useEnter } from "../components/primitives";

const LOG = [
  { at: 100, icon: "👁", text: "get_context · dietary, budget", color: theme.inkMuted },
  { at: 112, icon: "⏳", text: "request_approval · €240 travel", color: theme.accent },
  { at: 124, icon: "✓", text: "approved by amir · via Telegram", color: theme.success },
  { at: 136, icon: "✓", text: "Hotel Adlon booked · HZ-8842", color: theme.success },
];

export const CheckApproval: React.FC = () => {
  const frame = useCurrentFrame();
  const outOp = interpolate(frame, [168, 180], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const lines: Line[] = [
    {
      at: 6,
      kind: "call",
      text: (
        <>
          <span style={{ color: theme.accent }}>check_approval</span>(id:{" "}
          <span style={{ color: theme.ink }}>"a4f1"</span>)
        </>
      ),
    },
    {
      at: 30,
      kind: "ok",
      text: (
        <>
          ✓ status: <span style={{ color: theme.success }}>"approved"</span> ·
          resolved by amir
        </>
      ),
    },
    { at: 52, kind: "prompt", text: "agent proceeds → reserving room…" },
    { at: 74, kind: "ok", text: "✓ Hotel Adlon booked · confirmation HZ-8842" },
    {
      at: 90,
      kind: "muted",
      text: "every read & approval is logged ↓",
    },
  ];

  const logCard = useEnter(92);

  return (
    <SceneShell step="Step 6" title="Approved → it acts, and it's logged">
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 44,
          opacity: outOp,
        }}
      >
        <TerminalWindow
          title={`agent · gated via ${BRAND.domain}/amir`}
          width={880}
          height={500}
          lines={lines}
        />

        <div
          style={{
            width: 700,
            height: 500,
            background: theme.surface,
            border: `1px solid ${theme.line}`,
            borderRadius: 14,
            padding: "30px 36px",
            boxShadow: "0 16px 44px rgba(0,0,0,0.07)",
            opacity: logCard.opacity,
            transform: `translateY(${logCard.y}px)`,
            fontFamily: theme.sans,
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: theme.inkMuted,
              marginBottom: 26,
            }}
          >
            Activity log · usegate.dev/amir
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {LOG.map((l, i) => {
              const op = interpolate(frame, [l.at, l.at + 10], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              const x = interpolate(frame, [l.at, l.at + 10], [-14, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <div
                  key={i}
                  style={{
                    opacity: op,
                    transform: `translateX(${x}px)`,
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "14px 18px",
                    background: theme.surface2,
                    borderRadius: 12,
                    border: `1px solid ${theme.line}`,
                  }}
                >
                  <span
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: `${l.color}22`,
                      color: l.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    {l.icon}
                  </span>
                  <span style={{ fontSize: 22, color: theme.ink }}>
                    {l.text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </SceneShell>
  );
};
