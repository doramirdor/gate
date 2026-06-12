import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { theme, term, BRAND } from "../theme";
import { SceneShell } from "../components/SceneShell";
import { TerminalWindow, Line } from "../components/Terminal";
import { useEnter } from "../components/primitives";

export const AgentContext: React.FC = () => {
  const frame = useCurrentFrame();
  const outOp = interpolate(frame, [168, 180], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const lines: Line[] = [
    { at: 6, kind: "prompt", text: "agent session started" },
    {
      at: 18,
      kind: "muted",
      text: `connecting → mcp/${"amir"}  ·  Bearer gate_sk_9f2c…a71e`,
    },
    {
      at: 40,
      kind: "call",
      text: (
        <>
          <span style={{ color: term.accent }}>get_context</span>(scope:{" "}
          <span style={{ color: term.ink }}>"dietary, budget"</span>)
        </>
      ),
    },
    { at: 70, kind: "ok", text: "✓ 200 · returns scoped profile markdown" },
  ];

  const card = useEnter(78);

  return (
    <SceneShell step="Step 4" title="The agent reads context — scoped">
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
          height={520}
          lines={lines}
        />

        {/* returned markdown */}
        <div
          style={{
            width: 700,
            height: 520,
            background: theme.surface,
            border: `1px solid ${theme.line}`,
            borderRadius: 14,
            padding: "34px 40px",
            boxShadow: "0 16px 44px rgba(0,0,0,0.07)",
            opacity: card.opacity,
            transform: `translateY(${card.y}px) scale(${card.scale})`,
            fontFamily: theme.sans,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              fontFamily: theme.mono,
              fontSize: 16,
              color: theme.inkMuted,
              marginBottom: 18,
            }}
          >
            get_context → response
          </div>
          <div style={{ fontSize: 34, fontWeight: 600, color: theme.ink }}>
            # amir
          </div>
          <MdSection
            title="Dietary"
            body="Vegetarian. Severe peanut allergy. No cilantro."
            at={96}
          />
          <MdSection
            title="Budget"
            body="Auto-approve under $50. Ask above. Hard ceiling $500."
            at={108}
          />
          <div
            style={{
              marginTop: 26,
              paddingTop: 18,
              borderTop: `1px solid ${theme.line}`,
              fontFamily: theme.mono,
              fontSize: 15,
              color: theme.inkMuted,
            }}
          >
            {BRAND.footer}
          </div>
          <div
            style={{
              marginTop: 14,
              fontSize: 17,
              color: theme.inkMuted,
              fontStyle: "italic",
            }}
          >
            Private sections it isn't scoped for never appear.
          </div>
        </div>
      </div>
    </SceneShell>
  );
};

const MdSection: React.FC<{ title: string; body: string; at: number }> = ({
  title,
  body,
  at,
}) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [at, at + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ marginTop: 22, opacity: op }}>
      <div
        style={{
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: theme.inkMuted,
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 24, color: theme.ink, lineHeight: 1.4 }}>
        {body}
      </div>
    </div>
  );
};
