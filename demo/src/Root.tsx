import React from "react";
import { Composition } from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { GateDemo, TOTAL_FRAMES } from "./GateDemo";
import { FPS, WIDTH, HEIGHT } from "./theme";

loadInter();
loadMono();

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="GateDemo"
      component={GateDemo}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
