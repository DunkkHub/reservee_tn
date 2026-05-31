import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          borderRadius: 32,
          background: "#030303",
          color: "#f2c86f",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 30,
            top: 42,
            width: 102,
            height: 102,
            border: "8px solid #f2c86f",
            borderRadius: 18,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 60,
            top: 26,
            width: 13,
            height: 28,
            borderRadius: 8,
            background: "#f2c86f",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 108,
            top: 26,
            width: 13,
            height: 28,
            borderRadius: 8,
            background: "#f2c86f",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 86,
            top: 56,
            fontSize: 88,
            fontWeight: 800,
            lineHeight: 1,
            fontFamily: "Georgia, serif",
            letterSpacing: -3,
            color: "#f2c86f",
          }}
        >
          R
        </div>
        <div
          style={{
            position: "absolute",
            left: 94,
            top: 96,
            width: 14,
            height: 14,
            borderRadius: 3,
            background: "#ffe39a",
            transform: "rotate(45deg)",
          }}
        />
      </div>
    ),
    size,
  );
}
