import React from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { theme } from "../theme";

// ---------------------------------------------------------------------------
// Cursor — a macOS-style pointer that eases between waypoints.
// ---------------------------------------------------------------------------
export type Waypoint = { x: number; y: number; at: number; click?: boolean };

export const Cursor: React.FC<{ path: Waypoint[] }> = ({ path }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Find the two waypoints we are between.
  let from = path[0];
  let to = path[0];
  for (let i = 0; i < path.length; i++) {
    if (path[i].at <= frame) {
      from = path[i];
      to = path[Math.min(i + 1, path.length - 1)];
    }
  }
  const segFrames = Math.max(1, to.at - from.at);
  const t = interpolate(frame, [from.at, from.at + segFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });
  const x = interpolate(t, [0, 1], [from.x, to.x]);
  const y = interpolate(t, [0, 1], [from.y, to.y]);

  // Click pulse: scale down briefly when a waypoint marked click is reached.
  const activeClick = [...path].reverse().find((p) => p.click && p.at <= frame);
  let clickScale = 1;
  if (activeClick) {
    const since = frame - activeClick.at;
    clickScale = interpolate(since, [0, 4, 9], [1, 0.78, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  }

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `scale(${clickScale})`,
        transformOrigin: "top left",
        zIndex: 999,
        filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.5))",
        pointerEvents: "none",
      }}
    >
      <svg width={34} height={34} viewBox="0 0 24 24" fill="none">
        <path
          d="M4 2l5.5 16 2.2-6.4 6.4-2.2L4 2z"
          fill="#1d1d1f"
          stroke="#ffffff"
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

// Click ripple at a fixed point, triggered at `at`.
export const ClickRipple: React.FC<{ x: number; y: number; at: number }> = ({
  x,
  y,
  at,
}) => {
  const frame = useCurrentFrame();
  const since = frame - at;
  if (since < 0 || since > 24) return null;
  const r = interpolate(since, [0, 24], [4, 46], { extrapolateRight: "clamp" });
  const opacity = interpolate(since, [0, 24], [0.6, 0], {
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: "50%",
        border: `2px solid ${theme.accent}`,
        opacity,
        zIndex: 998,
      }}
    />
  );
};

// ---------------------------------------------------------------------------
// Typewriter — reveals text char-by-char between startFrame and endFrame.
// ---------------------------------------------------------------------------
export const useTyped = (
  text: string,
  startFrame: number,
  charsPerFrame = 0.9
) => {
  const frame = useCurrentFrame();
  const n = Math.floor(Math.max(0, frame - startFrame) * charsPerFrame);
  return text.slice(0, n);
};

export const Caret: React.FC<{ color?: string; on?: boolean }> = ({
  color = theme.ink,
  on = true,
}) => {
  const frame = useCurrentFrame();
  const blink = on && Math.floor(frame / 15) % 2 === 0;
  return (
    <span
      style={{
        display: "inline-block",
        width: 2,
        height: "1em",
        marginLeft: 1,
        background: color,
        opacity: blink ? 1 : 0,
        transform: "translateY(2px)",
      }}
    />
  );
};

// ---------------------------------------------------------------------------
// Browser chrome — a window frame with a URL bar.
// ---------------------------------------------------------------------------
export const BrowserChrome: React.FC<{
  url: string;
  width: number;
  height: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ url, width, height, children, style }) => {
  return (
    <div
      style={{
        width,
        height,
        background: theme.surface,
        borderRadius: 16,
        border: `1px solid ${theme.line}`,
        overflow: "hidden",
        boxShadow: "0 24px 60px rgba(0,0,0,0.10)",
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      <div
        style={{
          height: 56,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "0 20px",
          background: theme.surface2,
          borderBottom: `1px solid ${theme.line}`,
        }}
      >
        <div style={{ display: "flex", gap: 9 }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <div
              key={c}
              style={{ width: 13, height: 13, borderRadius: "50%", background: c }}
            />
          ))}
        </div>
        <div
          style={{
            flex: 1,
            height: 32,
            background: theme.bg,
            borderRadius: 8,
            border: `1px solid ${theme.line}`,
            display: "flex",
            alignItems: "center",
            padding: "0 14px",
            gap: 9,
            color: theme.inkMuted,
            fontFamily: theme.mono,
            fontSize: 15,
          }}
        >
          <span style={{ color: theme.success, fontSize: 13 }}>🔒</span>
          <span style={{ color: theme.ink }}>{url}</span>
        </div>
      </div>
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Small reusable entrance helpers
// ---------------------------------------------------------------------------
export const useEnter = (startFrame: number, dur = 18) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 18, stiffness: 120, mass: 0.8 },
  });
  const opacity = interpolate(frame, [startFrame, startFrame + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return { y: (1 - s) * 22, scale: 0.96 + s * 0.04, opacity, s };
};

export const Pill: React.FC<{
  label: string;
  color: string;
  bg?: string;
  size?: number;
}> = ({ label, color, bg, size = 15 }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: `4px 10px`,
      borderRadius: 999,
      fontFamily: theme.mono,
      fontSize: size,
      fontWeight: 500,
      color,
      background: bg ?? `${color}1a`,
      border: `1px solid ${color}44`,
      whiteSpace: "nowrap",
    }}
  >
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: color,
      }}
    />
    {label}
  </span>
);
