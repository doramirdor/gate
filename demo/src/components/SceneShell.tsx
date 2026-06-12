import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { GateMark } from "./GateLogo";

// Faint dotted backdrop + a top-left step label, shared by content scenes.
export const SceneShell: React.FC<{
  step?: string;
  title?: string;
  children: React.ReactNode;
}> = ({ step, title, children }) => {
  const frame = useCurrentFrame();
  const labelOp = interpolate(frame, [4, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        background: theme.bg,
        backgroundImage: `radial-gradient(${theme.line} 1px, transparent 1px)`,
        backgroundSize: "44px 44px",
        fontFamily: theme.sans,
      }}
    >
      {(step || title) && (
        <div
          style={{
            position: "absolute",
            top: 64,
            left: 88,
            display: "flex",
            alignItems: "center",
            gap: 16,
            opacity: labelOp,
          }}
        >
          <GateMark size={34} color={theme.accent} />
          {step && (
            <span
              style={{
                fontFamily: theme.mono,
                fontSize: 18,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: theme.accent,
              }}
            >
              {step}
            </span>
          )}
          {title && (
            <span
              style={{
                fontSize: 26,
                fontWeight: 600,
                color: theme.ink,
                letterSpacing: "-0.01em",
              }}
            >
              {title}
            </span>
          )}
        </div>
      )}
      {children}
    </AbsoluteFill>
  );
};
