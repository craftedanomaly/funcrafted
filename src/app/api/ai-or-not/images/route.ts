import { NextRequest, NextResponse } from "next/server";
import { getManifest, normalizeAssetUrl } from "@/lib/r2";

// Public endpoint - no auth required
// Returns shuffled images for the game
export async function GET(request: NextRequest) {
  try {
    const manifest = await getManifest();
    
    // Shuffle images
    const shuffled = [...manifest.images].sort(() => Math.random() - 0.5);
    
    // Return only what the game needs (hide source until reveal)
    // Normalize URLs to use NEXT_PUBLIC_ASSET_BASE_URL
    const gameImages = shuffled.map((img) => ({
      id: img.id,
      url: normalizeAssetUrl(img.url),
      isAI: img.isAI,
      source: img.source,
    }));
    
    return NextResponse.json({ success: true, data: gameImages });
  } catch (error) {
    console.error("AI-or-Not images API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch images" },
      { status: 500 }
    );
  }
}
