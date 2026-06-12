import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { theme, BRAND } from "../theme";
import { SceneShell } from "../components/SceneShell";
import { Pill, useEnter } from "../components/primitives";

export const Endpoint: React.FC = () => {
  const frame = useCurrentFrame();
  const endpoint = useEnter(8);
  const token = useEnter(34);
  const scopes = useEnter(60);
  const outOp = interpolate(frame, [118, 130], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const box: React.CSSProperties = {
    background: theme.surface,
    border: `1px solid ${theme.line}`,
    borderRadius: 16,
    padding: "30px 36px",
    width: 1180,
    boxShadow: "0 12px 32px rgba(0,0,0,0.06)",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: theme.inkMuted,
    marginBottom: 14,
  };

  return (
    <SceneShell step="Step 3" title="Get your endpoint + tokens">
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 26,
          opacity: outOp,
        }}
      >
        <div
          style={{
            ...box,
            opacity: endpoint.opacity,
            transform: `translateY(${endpoint.y}px)`,
          }}
        >
          <div style={labelStyle}>MCP endpoint</div>
          <div
            style={{
              fontFamily: theme.mono,
              fontSize: 30,
              color: theme.ink,
            }}
          >
            <span style={{ color: theme.success }}>POST </span>
            https://{BRAND.domain}/functions/v1/mcp/
            <span style={{ color: theme.accent }}>amir</span>
          </div>
        </div>

        <div
          style={{
            ...box,
            opacity: token.opacity,
            transform: `translateY(${token.y}px)`,
          }}
        >
          <div style={labelStyle}>Bearer token</div>
          <div
            style={{
              fontFamily: theme.mono,
              fontSize: 26,
              color: theme.ink,
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <span
              style={{
                background: theme.surface2,
                border: `1px solid ${theme.line}`,
                borderRadius: 8,
                padding: "10px 16px",
                color: theme.inkMuted,
              }}
            >
              gate_sk_9f2c…a71e
            </span>
            <span style={{ fontSize: 18, color: theme.inkMuted }}>
              ↳ scopes what each agent can read
            </span>
          </div>
        </div>

        <div
          style={{
            ...box,
            opacity: scopes.opacity,
            transform: `translateY(${scopes.y}px)`,
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <span style={{ ...labelStyle, marginBottom: 0 }}>Scopes</span>
          <Pill label="public" color={theme.success} size={18} />
          <Pill label="dietary" color={theme.accent} size={18} />
          <Pill label="budget" color={theme.danger} size={18} />
          <Pill label="approvals" color={theme.ink} size={18} />
          <div style={{ flex: 1 }} />
          <span style={{ color: theme.inkMuted, fontSize: 18 }}>
            revoke any token, anytime
          </span>
        </div>
      </div>
    </SceneShell>
  );
};
