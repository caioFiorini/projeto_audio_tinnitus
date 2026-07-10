import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #f7faf8 0%, #dcebe5 100%)",
          borderRadius: 112,
        }}
      >
        <div
          style={{
            width: 330,
            height: 330,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            background: "linear-gradient(145deg, #8e8dcb 0%, #6f6bb5 100%)",
            boxShadow: "0 30px 60px rgba(62, 65, 112, 0.24)",
            color: "white",
            fontSize: 210,
            fontFamily: "serif",
            lineHeight: 1,
          }}
        >
          ≈
        </div>
      </div>
    ),
    {
      width: 512,
      height: 512,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
}
