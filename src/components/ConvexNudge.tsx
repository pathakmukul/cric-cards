import React from "react";
import { ConvexNudge } from "@convex-nudge/react";

export default function NudgeWidget() {
  return (
    <div style={{ position: "relative", zIndex: 60 }}>
      <ConvexNudge
        variant="purple"
        position="bottom-right"
        animation="slide"
        project="giant-firefly-526"
        theme="dark"
      />
    </div>
  );
}
