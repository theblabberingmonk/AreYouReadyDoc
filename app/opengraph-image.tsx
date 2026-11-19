import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#faf9f6",
        }}
      >
        <div
          style={{
            fontSize: 24,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#78868a",
            marginBottom: 24,
          }}
        >
          DrNB Paediatric Surgery · Final theory
        </div>
        <div
          style={{
            fontSize: 84,
            lineHeight: 1.05,
            color: "#172726",
            fontFamily: "Georgia, serif",
          }}
        >
          The papers, answered.
        </div>
        <div style={{ fontSize: 28, color: "#3f5152", marginTop: 28 }}>
          17 papers · 170 theory questions · illustrated model answers
        </div>
      </div>
    ),
    { ...size },
  );
}
