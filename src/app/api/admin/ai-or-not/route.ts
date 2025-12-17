import { NextRequest, NextResponse } from "next/server";
import {
  getManifest,
  saveManifest,
  uploadImage,
  deleteImage,
  generateImageId,
  normalizeAssetUrl,
  ImageManifestItem,
} from "@/lib/r2";

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
    headers: {
      "WWW-Authenticate": 'Basic realm="Admin"',
    },
  });
}

// GET - List all images
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return unauthorizedResponse();
  }

  try {
    const manifest = await getManifest();
    // Normalize image URLs to use NEXT_PUBLIC_ASSET_BASE_URL
    const normalizedManifest = {
      ...manifest,
      images: manifest.images.map((img) => ({
        ...img,
        url: normalizeAssetUrl(img.url),
      })),
    };
    return NextResponse.json({ success: true, data: normalizedManifest });
  } catch (error) {
    console.error("Admin GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch images" },
      { status: 500 }
    );
  }
}

// POST - Add new image (upload or link)
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return unauthorizedResponse();
  }

  try {
    const contentType = request.headers.get("content-type") || "";

    let newImage: ImageManifestItem;

    if (contentType.includes("multipart/form-data")) {
      // Handle file upload
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const isAI = formData.get("isAI") === "true";
      const source = (formData.get("source") as string) || "";

      if (!file) {
        return NextResponse.json(
          { success: false, error: "No file provided" },
          { status: 400 }
        );
      }

      const buffer = await file.arrayBuffer();
      const ext = file.name.split(".").pop() || "jpg";
      const id = generateImageId();
      const filename = `${id}.${ext}`;

      const url = await uploadImage(buffer, filename, file.type);
      if (!url) {
        return NextResponse.json(
          { success: false, error: "Failed to upload image" },
          { status: 500 }
        );
      }

      newImage = {
        id,
        filename,
        url,
        isAI,
        source,
        createdAt: new Date().toISOString(),
      };
    } else {
      // Handle JSON (link)
      const body = await request.json();
      const { url, isAI, source } = body;

      if (!url || typeof url !== "string") {
        return NextResponse.json(
          { success: false, error: "URL is required" },
          { status: 400 }
        );
      }

      const id = generateImageId();
      newImage = {
        id,
        filename: "",
        url,
        isAI: Boolean(isAI),
        source: source || "",
        createdAt: new Date().toISOString(),
      };
    }

    // Add to manifest
    const manifest = await getManifest();
    manifest.images.push(newImage);
    manifest.updatedAt = new Date().toISOString();

    const saved = await saveManifest(manifest);
    if (!saved) {
      return NextResponse.json(
        { success: false, error: "Failed to save manifest" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: newImage });
  } catch (error) {
    console.error("Admin POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add image" },
      { status: 500 }
    );
  }
}

// DELETE - Remove image
export async function DELETE(request: NextRequest) {
  if (!checkAuth(request)) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Image ID is required" },
        { status: 400 }
      );
    }

    const manifest = await getManifest();
    const imageIndex = manifest.images.findIndex((img) => img.id === id);

    if (imageIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Image not found" },
        { status: 404 }
      );
    }

    const image = manifest.images[imageIndex];

    // Delete from R2 if it was uploaded (has filename)
    if (image.filename) {
      await deleteImage(image.filename);
    }

    // Remove from manifest
    manifest.images.splice(imageIndex, 1);
    manifest.updatedAt = new Date().toISOString();

    const saved = await saveManifest(manifest);
    if (!saved) {
      return NextResponse.json(
        { success: false, error: "Failed to save manifest" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete image" },
      { status: 500 }
    );
  }
}

// PATCH - Update image (isAI, source)
export async function PATCH(request: NextRequest) {
  if (!checkAuth(request)) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const { id, isAI, source } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Image ID is required" },
        { status: 400 }
      );
    }

    const manifest = await getManifest();
    const image = manifest.images.find((img) => img.id === id);

    if (!image) {
      return NextResponse.json(
        { success: false, error: "Image not found" },
        { status: 404 }
      );
    }

    if (typeof isAI === "boolean") {
      image.isAI = isAI;
    }
    if (typeof source === "string") {
      image.source = source;
    }

    manifest.updatedAt = new Date().toISOString();

    const saved = await saveManifest(manifest);
    if (!saved) {
      return NextResponse.json(
        { success: false, error: "Failed to save manifest" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: image });
  } catch (error) {
    console.error("Admin PATCH error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update image" },
      { status: 500 }
    );
  }
}
