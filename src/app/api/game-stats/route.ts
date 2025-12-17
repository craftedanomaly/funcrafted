import { NextRequest, NextResponse } from "next/server";
import { getTotalPlayCount, incrementGamePlayCount, getAllGameStats } from "@/lib/firebase";

// GET - Get total play count or all stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get("detailed") === "true";

    if (detailed) {
      const stats = await getAllGameStats();
      const total = stats.reduce((sum, s) => sum + s.playCount, 0);
      return NextResponse.json({
        success: true,
        data: { total, games: stats },
      });
    }

    const total = await getTotalPlayCount();
    return NextResponse.json({
      success: true,
      data: { total },
    });
  } catch (error) {
    console.error("Game stats GET error:", error);
    const err = error as any;
    const code = typeof err?.code === "string" ? err.code : undefined;
    const message = typeof err?.message === "string" ? err.message : "Failed to fetch game stats";

    const status = code === "permission-denied" ? 403 : 500;
    return NextResponse.json(
      { success: false, error: message, code },
      { status }
    );
  }
}

// POST - Increment play count for a game
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameId } = body;

    if (!gameId || typeof gameId !== "string") {
      return NextResponse.json(
        { success: false, error: "gameId is required" },
        { status: 400 }
      );
    }

    await incrementGamePlayCount(gameId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Game stats POST error:", error);
    const err = error as any;
    const code = typeof err?.code === "string" ? err.code : undefined;
    const message = typeof err?.message === "string" ? err.message : "Failed to increment play count";

    const status = code === "permission-denied" ? 403 : 500;
    return NextResponse.json(
      { success: false, error: message, code },
      { status }
    );
  }
}
