/**
 * Cloudflare R2 Storage Client
 * Uses S3-compatible API
 */

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "funcrafted";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

function getR2Endpoint(): string {
  return `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
}

function getAuthHeaders(method: string, path: string, contentType?: string): HeadersInit {
  const date = new Date().toUTCString();
  const headers: HeadersInit = {
    "x-amz-date": date,
    "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
  };
  if (contentType) {
    headers["Content-Type"] = contentType;
  }
  return headers;
}

// Simple AWS Signature V4 implementation for R2
async function signRequest(
  method: string,
  path: string,
  headers: Record<string, string>,
  body?: ArrayBuffer | string
): Promise<Record<string, string>> {
  const encoder = new TextEncoder();
  const algorithm = "AWS4-HMAC-SHA256";
  const service = "s3";
  const region = "auto";
  
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "").slice(0, 15) + "Z";
  const dateStamp = amzDate.slice(0, 8);
  
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  
  const signedHeaders = Object.keys(headers)
    .map((k) => k.toLowerCase())
    .sort()
    .join(";");
  
  const canonicalHeaders = Object.entries(headers)
    .map(([k, v]) => `${k.toLowerCase()}:${v.trim()}`)
    .sort()
    .join("\n") + "\n";
  
  const payloadHash = "UNSIGNED-PAYLOAD";
  
  const canonicalRequest = [
    method,
    path,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  
  const canonicalRequestHash = await sha256Hex(canonicalRequest);
  
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join("\n");
  
  const kDate = await hmacSha256(encoder.encode("AWS4" + R2_SECRET_ACCESS_KEY), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, "aws4_request");
  const signature = await hmacSha256Hex(kSigning, stringToSign);
  
  const authorization = `${algorithm} Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  
  return {
    ...headers,
    "x-amz-date": amzDate,
    Authorization: authorization,
  };
}

async function sha256Hex(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256(key: ArrayBuffer | Uint8Array, message: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyBuffer = key instanceof Uint8Array ? key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) : key;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBuffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
}

async function hmacSha256Hex(key: ArrayBuffer, message: string): Promise<string> {
  const sig = await hmacSha256(key, message);
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface ImageManifestItem {
  id: string;
  filename: string;
  url: string;
  isAI: boolean;
  source?: string;
  createdAt: string;
}

export interface ImageManifest {
  images: ImageManifestItem[];
  updatedAt: string;
}

const MANIFEST_KEY = "ai-or-not/manifest.json";

export async function getManifest(): Promise<ImageManifest> {
  try {
    const endpoint = getR2Endpoint();
    const path = `/${R2_BUCKET_NAME}/${MANIFEST_KEY}`;
    const url = `${endpoint}${path}`;
    
    const headers: Record<string, string> = {
      Host: `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
    };
    
    const signedHeaders = await signRequest("GET", path, headers);
    
    const res = await fetch(url, {
      method: "GET",
      headers: signedHeaders,
      cache: "no-store",
    });
    
    if (res.status === 404) {
      return { images: [], updatedAt: new Date().toISOString() };
    }
    
    if (!res.ok) {
      console.error("R2 getManifest error:", res.status, await res.text());
      return { images: [], updatedAt: new Date().toISOString() };
    }
    
    const manifest = await res.json();
    return manifest as ImageManifest;
  } catch (error) {
    console.error("R2 getManifest error:", error);
    return { images: [], updatedAt: new Date().toISOString() };
  }
}

export async function saveManifest(manifest: ImageManifest): Promise<boolean> {
  try {
    const endpoint = getR2Endpoint();
    const path = `/${R2_BUCKET_NAME}/${MANIFEST_KEY}`;
    const url = `${endpoint}${path}`;
    
    const body = JSON.stringify(manifest);
    
    const headers: Record<string, string> = {
      Host: `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      "Content-Type": "application/json",
      "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
    };
    
    const signedHeaders = await signRequest("PUT", path, headers);
    
    const res = await fetch(url, {
      method: "PUT",
      headers: signedHeaders,
      body,
      cache: "no-store",
    });
    
    if (!res.ok) {
      console.error("R2 saveManifest error:", res.status, await res.text());
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("R2 saveManifest error:", error);
    return false;
  }
}

export async function uploadImage(
  file: ArrayBuffer,
  filename: string,
  contentType: string
): Promise<string | null> {
  try {
    const endpoint = getR2Endpoint();
    const key = `ai-or-not/images/${filename}`;
    const path = `/${R2_BUCKET_NAME}/${key}`;
    const url = `${endpoint}${path}`;
    
    const headers: Record<string, string> = {
      Host: `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      "Content-Type": contentType,
      "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
    };
    
    const signedHeaders = await signRequest("PUT", path, headers);
    
    const res = await fetch(url, {
      method: "PUT",
      headers: signedHeaders,
      body: file,
      cache: "no-store",
    });
    
    if (!res.ok) {
      console.error("R2 uploadImage error:", res.status, await res.text());
      return null;
    }
    
    // Return public URL
    if (R2_PUBLIC_URL) {
      return `${R2_PUBLIC_URL}/${key}`;
    }
    return `${endpoint}/${R2_BUCKET_NAME}/${key}`;
  } catch (error) {
    console.error("R2 uploadImage error:", error);
    return null;
  }
}

export async function deleteImage(filename: string): Promise<boolean> {
  try {
    const endpoint = getR2Endpoint();
    const key = `ai-or-not/images/${filename}`;
    const path = `/${R2_BUCKET_NAME}/${key}`;
    const url = `${endpoint}${path}`;
    
    const headers: Record<string, string> = {
      Host: `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
    };
    
    const signedHeaders = await signRequest("DELETE", path, headers);
    
    const res = await fetch(url, {
      method: "DELETE",
      headers: signedHeaders,
      cache: "no-store",
    });
    
    if (!res.ok && res.status !== 204) {
      console.error("R2 deleteImage error:", res.status, await res.text());
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("R2 deleteImage error:", error);
    return false;
  }
}

export function generateImageId(): string {
  return `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
