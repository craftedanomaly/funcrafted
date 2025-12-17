import { NextRequest, NextResponse } from "next/server";
import {
  addLeaderboardEntry,
  getLeaderboard,
  deleteLeaderboardEntry,
  resetLeaderboard,
  getScoreRanks,
  getRankForScore,
  ScoreRank,
} from "@/lib/firebase";
import { normalizeAssetUrl } from "@/lib/r2";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "funcrafted2024";

function checkAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return false;
  }
  const base64Credentials = authHeader.slice(6);
  const credentials = atob(base64Credentials);
  const [username, password] = credentials.split(":");
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}

// GET - Get leaderboard entries
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const { searchParams } = new URL(request.url);
    const limitCount = parseInt(searchParams.get("limit") || "50", 10);

    const entries = await getLeaderboard(gameId, limitCount);
    const ranks = await getScoreRanks(gameId);

    // Normalize imageUrl in ranks to use NEXT_PUBLIC_ASSET_BASE_URL
    const normalizedRanks = ranks.map((rank) => ({
      ...rank,
      imageUrl: rank.imageUrl ? normalizeAssetUrl(rank.imageUrl) : "",
    }));

    return NextResponse.json({
      success: true,
      data: { entries, ranks: normalizedRanks },
    });
  } catch (error) {
    console.error("Leaderboard GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}

// POST - Add new leaderboard entry
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const body = await request.json();
    const { nickname, score } = body;

    if (!nickname || typeof nickname !== "string" || nickname.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Nickname is required" },
        { status: 400 }
      );
    }

    if (typeof score !== "number" || score < 0) {
      return NextResponse.json(
        { success: false, error: "Valid score is required" },
        { status: 400 }
      );
    }

    const entryId = await addLeaderboardEntry(gameId, nickname, score);
    const rank = await getRankForScore(gameId, score);

    // Normalize rank imageUrl if present
    const normalizedRank = rank ? {
      ...rank,
      imageUrl: rank.imageUrl ? normalizeAssetUrl(rank.imageUrl) : "",
    } : null;

    return NextResponse.json({
      success: true,
      data: { entryId, rank: normalizedRank },
    });
  } catch (error) {
    console.error("Leaderboard POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add entry" },
      { status: 500 }
    );
  }
}

// DELETE - Delete entry or reset leaderboard (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  if (!checkAuth(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { gameId } = await params;
    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get("entryId");
    const resetAll = searchParams.get("reset") === "true";

    if (resetAll) {
      const deletedCount = await resetLeaderboard(gameId);
      return NextResponse.json({
        success: true,
        data: { deletedCount },
      });
    }

    if (entryId) {
      await deleteLeaderboardEntry(entryId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: "entryId or reset=true required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Leaderboard DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete" },
      { status: 500 }
    );
  }
}
