import React from "react";

// The Gate mark: lintel + two posts + the human dot.
// `draw` (0..1) animates the strokes drawing in; the human dot fades after.
export const GateMark: React.FC<{
  size?: number;
  color?: string;
  draw?: number;
  dotColor?: string;
}> = ({ size = 120, color = "#ededef", draw = 1, dotColor }) => {
  // total dash length per stroke (generous, clamped by pathLength=1 trick)
  const dash = 1 - Math.min(1, Math.max(0, draw));
  const dotOpacity = Math.min(1, Math.max(0, (draw - 0.75) / 0.25));
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label="Gate mark"
    >
      <path
        d="M3.5 5h17"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={dash}
      />
      <path
        d="M6.5 5v15.5"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={dash}
      />
      <path
        d="M17.5 5v15.5"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={dash}
      />
      <circle
        cx={12}
        cy={14}
        r={2.25}
        fill={dotColor ?? color}
        opacity={dotOpacity}
      />
    </svg>
  );
};

export const GateWordmark: React.FC<{
  height?: number;
  color?: string;
  draw?: number;
}> = ({ height = 48, color = "#ededef", draw = 1 }) => {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: height * 0.28 }}>
      <GateMark size={height} color={color} draw={draw} />
      <span
        style={{
          fontFamily:
            'Inter, "Inter Variable", system-ui, sans-serif',
          fontWeight: 600,
          fontSize: height * 0.82,
          letterSpacing: "-0.03em",
          color,
          opacity: Math.min(1, Math.max(0, (draw - 0.5) / 0.5)),
        }}
      >
        gate
      </span>
    </div>
  );
};
