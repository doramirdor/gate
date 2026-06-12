import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { SceneShell } from "../components/SceneShell";
import { useEnter } from "../components/primitives";

const ACTIONS = [
  { icon: "💳", label: "Spends $240", color: theme.danger },
  { icon: "✉️", label: "Sends emails as you", color: theme.danger },
  { icon: "📅", label: "Books your calendar", color: theme.accent },
  { icon: "🛒", label: "Places orders", color: theme.danger },
];

export const Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const headEnter = useEnter(6);
  const subOp = interpolate(frame, [24, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const outOp = interpolate(frame, [108, 120], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <SceneShell>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          opacity: outOp,
        }}
      >
        <div
          style={{
            fontSize: 64,
            fontWeight: 600,
            color: theme.ink,
            letterSpacing: "-0.02em",
            textAlign: "center",
            opacity: headEnter.opacity,
            transform: `translateY(${headEnter.y}px)`,
          }}
        >
          Your agent acts <span style={{ color: theme.accent }}>for you.</span>
        </div>
        <div
          style={{
            fontSize: 32,
            color: theme.inkMuted,
            marginTop: 16,
            opacity: subOp,
          }}
        >
          Without a gate, nothing stands between intent and action.
        </div>

        <div style={{ display: "flex", gap: 26, marginTop: 64 }}>
          {ACTIONS.map((a, i) => {
            const e = useEnter(44 + i * 9);
            return (
              <div
                key={a.label}
                style={{
                  width: 250,
                  height: 168,
                  background: theme.surface,
                  border: `1px solid ${theme.line}`,
                  borderRadius: 16,
                  padding: 26,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  opacity: e.opacity,
                  transform: `translateY(${e.y}px) scale(${e.scale})`,
                  boxShadow: "0 12px 32px rgba(0,0,0,0.06)",
                }}
              >
                <div style={{ fontSize: 44 }}>{a.icon}</div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 500,
                    color: theme.ink,
                  }}
                >
                  {a.label}
                </div>
                <div
                  style={{
                    fontFamily: theme.mono,
                    fontSize: 14,
                    color: a.color,
                    letterSpacing: "0.04em",
                  }}
                >
                  no approval ✗
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SceneShell>
  );
};
