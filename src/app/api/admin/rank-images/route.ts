import { NextRequest, NextResponse } from "next/server";
import { uploadImage, generateImageId } from "@/lib/r2";

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

// POST - Upload rank image to R2
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return unauthorizedResponse();
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const ext = file.name.split(".").pop() || "png";
    const imageId = generateImageId();
    const key = `rank-images/${imageId}.${ext}`;

    const url = await uploadImage(arrayBuffer, imageId, file.type, key);

    if (!url) {
      return NextResponse.json(
        { success: false, error: "Failed to upload to R2" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { url, filename: key },
    });
  } catch (error) {
    console.error("Rank image upload error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload image" },
      { status: 500 }
    );
  }
}
