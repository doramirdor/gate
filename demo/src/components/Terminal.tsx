import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { term as theme } from "../theme";

export type Line = {
  at: number;
  kind?: "prompt" | "call" | "out" | "ok" | "warn" | "muted" | "json";
  text: React.ReactNode;
  indent?: number;
};

const KIND_COLOR: Record<NonNullable<Line["kind"]>, string> = {
  prompt: theme.inkMuted,
  call: theme.accent,
  out: theme.ink,
  ok: theme.success,
  warn: theme.danger,
  muted: theme.inkMuted,
  json: theme.ink,
};

export const TerminalWindow: React.FC<{
  title: string;
  width: number;
  height: number;
  lines: Line[];
  style?: React.CSSProperties;
}> = ({ title, width, height, lines, style }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        width,
        height,
        background: "#0c0c0e",
        borderRadius: 14,
        border: `1px solid ${theme.line}`,
        overflow: "hidden",
        boxShadow: "0 24px 60px rgba(0,0,0,0.22)",
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      <div
        style={{
          height: 46,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 18px",
          background: theme.surface2,
          borderBottom: `1px solid ${theme.line}`,
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <div
              key={c}
              style={{ width: 11, height: 11, borderRadius: "50%", background: c }}
            />
          ))}
        </div>
        <span
          style={{
            fontFamily: theme.mono,
            fontSize: 15,
            color: theme.inkMuted,
            marginLeft: 6,
          }}
        >
          {title}
        </span>
      </div>
      <div
        style={{
          flex: 1,
          padding: "22px 26px",
          fontFamily: theme.mono,
          fontSize: 21,
          lineHeight: 1.65,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {lines.map((l, i) => {
          const op = interpolate(frame, [l.at, l.at + 8], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const y = interpolate(frame, [l.at, l.at + 8], [6, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={i}
              style={{
                opacity: op,
                transform: `translateY(${y}px)`,
                color: KIND_COLOR[l.kind ?? "out"],
                paddingLeft: (l.indent ?? 0) * 24,
                whiteSpace: "pre-wrap",
              }}
            >
              {l.kind === "prompt" && (
                <span style={{ color: theme.success }}>$ </span>
              )}
              {l.kind === "call" && (
                <span style={{ color: theme.success }}>→ </span>
              )}
              {l.text}
            </div>
          );
        })}
      </div>
    </div>
  );
};
