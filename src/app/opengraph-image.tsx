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
          alignItems: "center",
          justifyContent: "center",
          background: "#030303",
          color: "#f2c86f",
          padding: "70px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "28px",
          }}
        >
          <div
            style={{
              position: "relative",
              display: "flex",
              width: 220,
              height: 220,
              color: "#f2c86f",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 24,
                top: 44,
                width: 140,
                height: 140,
                border: "10px solid #f2c86f",
                borderRadius: 24,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 66,
                top: 22,
                width: 16,
                height: 40,
                borderRadius: 10,
                background: "#f2c86f",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 130,
                top: 22,
                width: 16,
                height: 40,
                borderRadius: 10,
                background: "#f2c86f",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 102,
                top: 58,
                fontSize: 128,
                fontWeight: 800,
                lineHeight: 1,
                fontFamily: "Georgia, serif",
                letterSpacing: -4,
              }}
            >
              R
            </div>
            <div
              style={{
                position: "absolute",
                left: 118,
                top: 114,
                width: 24,
                height: 24,
                borderRadius: 5,
                background: "#ffe39a",
                transform: "rotate(45deg)",
              }}
            />
          </div>
          <div
            style={{
              fontSize: 104,
              fontWeight: 500,
              letterSpacing: -4,
              lineHeight: 1,
            }}
          >
            Reservee_TN
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <div style={{ width: 240, height: 2, background: "#a86f24" }} />
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                background: "#ffe39a",
                transform: "rotate(45deg)",
              }}
            />
            <div style={{ width: 240, height: 2, background: "#a86f24" }} />
          </div>
          <div
            style={{
              fontSize: 32,
              letterSpacing: 12,
              color: "#d9a64b",
              textTransform: "uppercase",
            }}
          >
            Book beauty. Feel confident
          </div>
        </div>
      </div>
    ),
    size,
  );
}
