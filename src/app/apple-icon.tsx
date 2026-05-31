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
            "linear-gradient(135deg, #f0b35f, #e98269)",
          color: "#18110d",
          fontSize: 76,
          fontWeight: 700,
          borderRadius: 24,
        }}
      >
        RT
      </div>
    ),
    size,
  );
}
