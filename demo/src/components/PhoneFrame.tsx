import React from "react";
import { theme } from "../theme";

export const PhoneFrame: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => {
  return (
    <div
      style={{
        width: 420,
        height: 840,
        borderRadius: 56,
        background: "#000",
        padding: 14,
        boxShadow: "0 30px 70px rgba(0,0,0,0.22)",
        border: `2px solid ${theme.line}`,
        position: "relative",
        ...style,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 44,
          background: theme.surface2,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* notch */}
        <div
          style={{
            position: "absolute",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            width: 130,
            height: 30,
            borderRadius: 999,
            background: "#000",
            zIndex: 5,
          }}
        />
        {children}
      </div>
    </div>
  );
};
