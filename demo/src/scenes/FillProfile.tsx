import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { SceneShell } from "../components/SceneShell";
import { Pill, useEnter, useTyped } from "../components/primitives";

type Vis = "public" | "link" | "private";
const VIS_COLOR: Record<Vis, string> = {
  public: theme.success,
  link: theme.accent,
  private: theme.danger,
};

const SECTIONS: {
  label: string;
  vis: Vis;
  body: string;
  appear: number;
}[] = [
  {
    label: "About",
    vis: "public",
    body: "Amir, product engineer in Tel Aviv. Refer to me as Amir.",
    appear: 8,
  },
  {
    label: "Scheduling",
    vis: "link",
    body: "GMT+3 · deep-work mornings · no meetings before 10:00.",
    appear: 22,
  },
  {
    label: "Dietary",
    vis: "link",
    body: "Vegetarian. Severe peanut allergy. No cilantro.",
    appear: 36,
  },
  {
    label: "Budget",
    vis: "private",
    body: "Auto-approve under $50. Ask above. Hard ceiling $500.",
    appear: 50,
  },
];

export const FillProfile: React.FC = () => {
  const frame = useCurrentFrame();
  const outOp = interpolate(frame, [186, 200], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const legendOp = interpolate(frame, [120, 138], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <SceneShell step="Step 2" title="Fill your profile">
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 34,
          opacity: outOp,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 26,
            width: 1280,
          }}
        >
          {SECTIONS.map((s) => {
            const e = useEnter(s.appear);
            const body = useTyped(s.body, s.appear + 10, 0.9);
            return (
              <div
                key={s.label}
                style={{
                  background: theme.surface,
                  border: `1px solid ${theme.line}`,
                  borderRadius: 16,
                  padding: "26px 30px",
                  height: 168,
                  opacity: e.opacity,
                  transform: `translateY(${e.y}px) scale(${e.scale})`,
                  boxShadow: "0 12px 32px rgba(0,0,0,0.06)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: theme.inkMuted,
                    }}
                  >
                    {s.label}
                  </span>
                  <Pill label={s.vis} color={VIS_COLOR[s.vis]} />
                </div>
                <div
                  style={{
                    fontSize: 26,
                    lineHeight: 1.4,
                    color: theme.ink,
                    fontWeight: 400,
                  }}
                >
                  {body}
                </div>
              </div>
            );
          })}
        </div>

        {/* visibility legend */}
        <div
          style={{
            display: "flex",
            gap: 40,
            opacity: legendOp,
            fontSize: 20,
            color: theme.inkMuted,
            alignItems: "center",
          }}
        >
          <LegendItem
            color={theme.success}
            name="public"
            desc="on your page + any token"
          />
          <LegendItem
            color={theme.accent}
            name="link"
            desc="any valid token"
          />
          <LegendItem
            color={theme.danger}
            name="private"
            desc="only tokens scoped to it"
          />
        </div>
      </div>
    </SceneShell>
  );
};

const LegendItem: React.FC<{ color: string; name: string; desc: string }> = ({
  color,
  name,
  desc,
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <span
      style={{ width: 12, height: 12, borderRadius: "50%", background: color }}
    />
    <span style={{ color: theme.ink, fontWeight: 600, fontFamily: theme.mono }}>
      {name}
    </span>
    <span style={{ color: theme.inkMuted }}>— {desc}</span>
  </div>
);
