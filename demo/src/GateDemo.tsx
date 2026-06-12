import React from "react";
import { AbsoluteFill, Series } from "remotion";
import { theme } from "./theme";
import { Intro } from "./scenes/Intro";
import { Problem } from "./scenes/Problem";
import { ClaimHandle } from "./scenes/ClaimHandle";
import { FillProfile } from "./scenes/FillProfile";
import { Endpoint } from "./scenes/Endpoint";
import { AgentContext } from "./scenes/AgentContext";
import { RequestApproval } from "./scenes/RequestApproval";
import { CheckApproval } from "./scenes/CheckApproval";
import { Outro } from "./scenes/Outro";

// Scene durations in frames (30fps). Sum = DURATION in Root.tsx.
export const SCENES = [
  { C: Intro, d: 110 },
  { C: Problem, d: 120 },
  { C: ClaimHandle, d: 140 },
  { C: FillProfile, d: 200 },
  { C: Endpoint, d: 130 },
  { C: AgentContext, d: 180 },
  { C: RequestApproval, d: 220 },
  { C: CheckApproval, d: 180 },
  { C: Outro, d: 120 },
] as const;

export const TOTAL_FRAMES = SCENES.reduce((n, s) => n + s.d, 0);

export const GateDemo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: theme.bg }}>
      <Series>
        {SCENES.map(({ C, d }, i) => (
          <Series.Sequence key={i} durationInFrames={d}>
            <C />
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  );
};
