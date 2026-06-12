import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme, BRAND } from "../theme";
import { GateMark } from "../components/GateLogo";
import { useEnter } from "../components/primitives";

const STEPS = [
  "get_context",
  "request_approval",
  "check_approval",
];

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const draw = interpolate(frame, [4, 34], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const tagOp = interpolate(frame, [30, 48], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rise = spring({ frame: frame - 30, fps, config: { damping: 20 } });
  const ctaOp = interpolate(frame, [70, 86], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: theme.bg,
        backgroundImage: `radial-gradient(${theme.line} 1px, transparent 1px)`,
        backgroundSize: "44px 44px",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: theme.sans,
      }}
    >
      <GateMark size={120} color={theme.ink} draw={draw} dotColor={theme.accent} />

      <div
        style={{
          fontSize: 56,
          fontWeight: 600,
          color: theme.ink,
          marginTop: 36,
          textAlign: "center",
          maxWidth: 1200,
          lineHeight: 1.25,
          letterSpacing: "-0.02em",
          opacity: tagOp,
          transform: `translateY(${(1 - rise) * 20}px)`,
        }}
      >
        AI acts within your limits.
        <br />
        <span style={{ color: theme.accent }}>You approve what goes beyond.</span>
      </div>

      <div
        style={{
          display: "flex",
          gap: 16,
          marginTop: 44,
        }}
      >
        {STEPS.map((s, i) => {
          const e = useEnter(48 + i * 8);
          return (
            <span
              key={s}
              style={{
                fontFamily: theme.mono,
                fontSize: 22,
                color: theme.inkMuted,
                background: theme.surface,
                border: `1px solid ${theme.line}`,
                borderRadius: 999,
                padding: "10px 22px",
                opacity: e.opacity,
                transform: `translateY(${e.y}px)`,
              }}
            >
              {s}
            </span>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 56,
          fontSize: 30,
          color: theme.inkMuted,
          opacity: ctaOp,
        }}
      >
        Claim yours at{" "}
        <span style={{ color: theme.ink, fontWeight: 600 }}>
          {BRAND.domain}
        </span>
      </div>
    </AbsoluteFill>
  );
};
