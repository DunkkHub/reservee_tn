import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(135deg, #241f1b 0%, #12100e 55%, #0c0d0c 100%)",
          padding: "72px",
          color: "#fffaf0",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            border: "1px solid rgba(240,179,95,0.28)",
            background: "rgba(255,250,240,0.06)",
            padding: "14px 24px",
            borderRadius: "14px",
            fontSize: 28,
            alignSelf: "flex-start",
          }}
        >
          Reservee TN
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ fontSize: 78, fontWeight: 700, lineHeight: 1.05 }}>
            The modern booking platform for beauty businesses in Tunisia.
          </div>
          <div style={{ fontSize: 32, color: "#dccfbf" }}>
            Premium design. Fast booking. Clean business operations.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
