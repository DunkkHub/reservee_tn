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
            "radial-gradient(circle at top left, rgba(200,169,107,0.24), transparent 32%), radial-gradient(circle at top right, rgba(77,157,224,0.16), transparent 24%), #0f1115",
          padding: "72px",
          color: "#f5f7fb",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.05)",
            padding: "14px 24px",
            borderRadius: "999px",
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
          <div style={{ fontSize: 32, color: "#c7cfda" }}>
            Premium design. Fast booking. Clean business operations.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
