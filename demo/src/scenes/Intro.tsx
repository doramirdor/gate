import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
  useVideoConfig,
} from "remotion";
import { theme, BRAND } from "../theme";
import { GateMark } from "../components/GateLogo";

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const draw = interpolate(frame, [6, 46], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const wordOp = interpolate(frame, [40, 56], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const taglineOp = interpolate(frame, [58, 78], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rise = spring({ frame: frame - 58, fps, config: { damping: 20 } });

  const outOp = interpolate(frame, [96, 110], [1, 0], {
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
        opacity: outOp,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 28,
          marginBottom: 36,
        }}
      >
        <GateMark size={150} color={theme.ink} draw={draw} dotColor={theme.accent} />
        <span
          style={{
            fontSize: 132,
            fontWeight: 600,
            letterSpacing: "-0.04em",
            color: theme.ink,
            opacity: wordOp,
          }}
        >
          gate
        </span>
      </div>
      <div
        style={{
          fontSize: 40,
          color: theme.inkMuted,
          maxWidth: 1100,
          textAlign: "center",
          lineHeight: 1.35,
          opacity: taglineOp,
          transform: `translateY(${(1 - rise) * 18}px)`,
        }}
      >
        AI acts within your limits.{" "}
        <span style={{ color: theme.ink, fontWeight: 500 }}>
          You approve what goes beyond.
        </span>
      </div>
    </AbsoluteFill>
  );
};
