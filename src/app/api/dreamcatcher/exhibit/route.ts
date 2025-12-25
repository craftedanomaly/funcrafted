import { NextRequest, NextResponse } from 'next/server';
import { uploadImage } from '@/lib/r2';
import { addDream } from '@/lib/firebase';

export async function POST(req: NextRequest) {
    try {
        const { image, username } = await req.json();

        // Debug R2 Config
        console.log("Exhibit Debug - Checking Env:");
        console.log("R2_ACCOUNT_ID:", process.env.R2_ACCOUNT_ID ? "Present" : "MISSING");
        console.log("R2_ACCESS_KEY_ID:", process.env.R2_ACCESS_KEY_ID ? "Present" : "MISSING");
        console.log("R2_SECRET_ACCESS_KEY:", process.env.R2_SECRET_ACCESS_KEY ? "Present" : "MISSING");
        console.log("R2_BUCKET_NAME:", process.env.R2_BUCKET_NAME ? "Present" : "MISSING");

        if (!image || !username) {
            return NextResponse.json({ error: 'Missing image or username' }, { status: 400 });
        }

        // 1. Convert Base64 to ArrayBuffer
        // The image comes as "data:image/png;base64,....." or just base64
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const arrayBuffer = new Uint8Array(buffer).buffer;

        // 2. Upload to R2
        const filename = `dream_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`;
        const imageUrl = await uploadImage(
            arrayBuffer,
            filename,
            'image/png',
            `dreamcatcher/gallery/${filename}` // Custom key in R2
        );

        if (!imageUrl) {
            throw new Error("Failed to upload image to storage.");
        }

        // 3. Save to Firebase
        await addDream({
            imageUrl,
            username
        });

        return NextResponse.json({ success: true, redirectUrl: '/dreamcatcher/gallery' });

    } catch (error: any) {
        console.error("Exhibit API Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to exhibit dream." },
            { status: 500 }
        );
    }
}
