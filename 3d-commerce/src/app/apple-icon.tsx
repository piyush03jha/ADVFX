import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 38,
          background: "#0a0b0f",
          color: "#c4b5fd",
          fontFamily: "Arial, sans-serif",
          fontSize: 58,
          fontWeight: 800,
          letterSpacing: "-5px",
        }}
      >
        V3D
      </div>
    ),
    size,
  );
}
