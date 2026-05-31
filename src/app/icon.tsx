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
            "linear-gradient(135deg, #241f1b 0%, #12100e 54%, #0c0d0c 100%)",
          color: "#fffaf0",
          fontSize: 212,
          fontWeight: 700,
          border: "14px solid rgba(240,179,95,0.42)",
          borderRadius: 72,
        }}
      >
        RT
      </div>
    ),
    size,
  );
}
