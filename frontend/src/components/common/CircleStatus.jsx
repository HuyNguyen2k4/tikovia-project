import React from "react";
import "@assets/CircleStatus.css";
import { Tooltip } from "antd";

export default function CircleStatus({ online, width = 10, height = 10 }) {
  return (
    <Tooltip title={online ? "Online" : "Offline"} color={online ? "#18ac35" : "#b9bbbe"}>
      <span
        className={`circle-status${online ? " online" : ""}`}
        style={{
          width,
          height,
          minWidth: width,
          minHeight: height,
        }}
      >
        {online && (
          <span
            className="circle-status-pulse"
            style={{
              width: width * 1.8,
              height: height * 1.8,
            }}
          />
        )}
      </span>
    </Tooltip>
  );
}