import { NextRequest, NextResponse } from "next/server";
import {
  getScoreRanks,
  setScoreRank,
  deleteScoreRank,
  initializeAiOrNotRanks,
  ScoreRank,
} from "@/lib/firebase";

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

function unauthorizedResponse(): NextResponse {
  return new NextResponse("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
  });
}

// GET - Get score ranks for a game
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get("gameId") || "ai-or-not";

    const ranks = await getScoreRanks(gameId);

    // Initialize default ranks if empty
    if (ranks.length === 0 && gameId === "ai-or-not") {
      await initializeAiOrNotRanks();
      const newRanks = await getScoreRanks(gameId);
      return NextResponse.json({ success: true, data: newRanks });
    }

    return NextResponse.json({ success: true, data: ranks });
  } catch (error) {
    console.error("Score ranks GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch score ranks" },
      { status: 500 }
    );
  }
}

// POST - Create or update a score rank
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const { id, gameId, minScore, maxScore, title, imageUrl } = body;

    if (!gameId || typeof minScore !== "number" || typeof maxScore !== "number" || !title) {
      return NextResponse.json(
        { success: false, error: "gameId, minScore, maxScore, and title are required" },
        { status: 400 }
      );
    }

    const rank: ScoreRank = {
      id,
      gameId,
      minScore,
      maxScore,
      title,
      imageUrl: imageUrl || "",
    };

    const rankId = await setScoreRank(rank);

    return NextResponse.json({ success: true, data: { id: rankId } });
  } catch (error) {
    console.error("Score ranks POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save score rank" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a score rank
export async function DELETE(request: NextRequest) {
  if (!checkAuth(request)) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const rankId = searchParams.get("id");

    if (!rankId) {
      return NextResponse.json(
        { success: false, error: "Rank ID is required" },
        { status: 400 }
      );
    }

    await deleteScoreRank(rankId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Score ranks DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete score rank" },
      { status: 500 }
    );
  }
}
