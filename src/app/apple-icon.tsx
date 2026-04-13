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
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, rgba(200,169,107,0.9), rgba(217,167,160,0.84))",
          color: "#131820",
          fontSize: 76,
          fontWeight: 700,
          borderRadius: 44,
        }}
      >
        RT
      </div>
    ),
    size,
  );
}
