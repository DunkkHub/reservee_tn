import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
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
            "radial-gradient(circle at top left, rgba(200,169,107,0.34), transparent 38%), #0f1115",
          color: "#f5f7fb",
          fontSize: 212,
          fontWeight: 700,
          borderRadius: 96,
        }}
      >
        RT
      </div>
    ),
    size,
  );
}
