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
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          borderRadius: 96,
          background: "#030303",
          color: "#f2c86f",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 86,
            top: 112,
            width: 292,
            height: 292,
            border: "22px solid #f2c86f",
            borderRadius: 52,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 174,
            top: 72,
            width: 32,
            height: 78,
            borderRadius: 18,
            background: "#f2c86f",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 304,
            top: 72,
            width: 32,
            height: 78,
            borderRadius: 18,
            background: "#f2c86f",
          }}
        />
        {[0, 1, 2].map((row) =>
          [0, 1].map((col) => (
            <div
              key={`${row}-${col}`}
              style={{
                position: "absolute",
                left: 153 + col * 64,
                top: 207 + row * 64,
                width: 30,
                height: 30,
                borderRadius: 8,
                background: "#f2c86f",
              }}
            />
          )),
        )}
        <div
          style={{
            position: "absolute",
            left: 244,
            top: 152,
            fontSize: 250,
            fontWeight: 800,
            lineHeight: 1,
            fontFamily: "Georgia, serif",
            letterSpacing: -8,
            color: "#f2c86f",
          }}
        >
          R
        </div>
        <div
          style={{
            position: "absolute",
            left: 266,
            top: 268,
            width: 38,
            height: 38,
            borderRadius: 8,
            background: "#ffe39a",
            transform: "rotate(45deg)",
          }}
        />
      </div>
    ),
    size,
  );
}
