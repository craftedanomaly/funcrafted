import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { checkRateLimit } from '@/lib/firebase';

// Allow extremely long timeout for retries (20s * 3 + delays)
export const maxDuration = 60;

// Helper for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function generateWithGemini(apiKey: string, image: string | null, prompt: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3-pro-image-preview' });

    let systemInstruction = `
      You are a comic book artist in the style of Mike Mignola (Hellboy). 
      Create a single-page comic strip (4-8 panels) based on the dream description.
      
      Visual Style:
      - Gothic Expressionism (Mike Mignola style).
      - Heavy shadows, high contrast, muted colors with specific pops of color.
      - jagged lines, blocky shadows. Dreamy look.
      - Do not put white borders around the image and do not put any signature.
      
      Story/Scene:
      - Adapting the following dream description: "${prompt}"
    `;

    if (image) {
        systemInstruction += `
        Subject:
        - The character in the comic SHOULD RESEMBLE the person in the provided image. Use the provided image as a strong character reference.
        `;
    }

    systemInstruction += `
      Output:
      - Return ONLY the generated image of the comic page.
    `;

    const parts: any[] = [{ text: systemInstruction }];

    if (image) {
        parts.push({
            inlineData: {
                data: image,
                mimeType: 'image/jpeg',
            },
        });
    }

    console.log('Sending request to Gemini...');
    const result = await model.generateContent(parts);
    const response = await result.response;

    // Extract image
    const responseParts = response.candidates?.[0]?.content?.parts;
    const generatedImagePart = responseParts?.find(p => p.inlineData);

    if (generatedImagePart && generatedImagePart.inlineData) {
        return generatedImagePart.inlineData.data;
    }

    throw new Error('Gemini did not return an image inlineData.');
}

async function generateWithOpenAI(apiKey: string, prompt: string) {
    console.log('Falling back to OpenAI...');
    // Note: Standard OpenAI Image API does not support image input for generation easily (only edit/variation).
    // We will use the prompt-only generation for fallback to ensure success.

    const enhancedPrompt = `
    Comic book page, Mike Mignola style, Gothic Expressionism. 
    Heavy shadows, high contrast, muted colors. 
    Subject: ${prompt}. 
    4-6 panels, single page.
    `;

    const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: "gpt-image-1.5-2025-12-16", // User specified model
            prompt: enhancedPrompt,
            n: 1,
            size: "1024x1024",
            response_format: "b64_json"
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.data[0].b64_json;
}

export async function POST(req: NextRequest) {
    try {
        // --- Rate Limiting Logic ---
        const forwardedFor = req.headers.get('x-forwarded-for');
        let ip = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown_ip';
        console.log(`[Generate] Checking Rate Limit for IP: ${ip}`);

        const limitCheck = await checkRateLimit(ip);
        if (!limitCheck.allowed) {
            console.log(`[Generate] Rate Limit Blocked: ${ip}`);
            return NextResponse.json({ error: limitCheck.error }, { status: 429 });
        }
        // --- End Rate Limiting ---

        const { image, prompt } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
        }

        const geminiKey = process.env.GEMINI_IMAGE_API_KEY;
        const openAIKey = process.env.OPENAI_API_KEY;

        if (!geminiKey) {
            return NextResponse.json({ error: 'Server configuration error: Missing Gemini API Key' }, { status: 500 });
        }

        // Attempt 1: Gemini
        try {
            const imageBase64 = await generateWithGemini(geminiKey, image, prompt);
            return NextResponse.json({ image: imageBase64 });
        } catch (err1) {
            console.error('Gemini Attempt 1 failed:', err1);

            // Wait 5 seconds
            await delay(5000);

            // Attempt 2: Gemini
            try {
                console.log('Retrying Gemini (Attempt 2)...');
                const imageBase64 = await generateWithGemini(geminiKey, image, prompt);
                return NextResponse.json({ image: imageBase64 });
            } catch (err2) {
                console.error('Gemini Attempt 2 failed:', err2);

                // Wait 5 seconds
                await delay(5000);

                // Attempt 3: Gemini
                try {
                    console.log('Retrying Gemini (Attempt 3)...');
                    const imageBase64 = await generateWithGemini(geminiKey, image, prompt);
                    return NextResponse.json({ image: imageBase64 });
                } catch (err3) {
                    console.error('Gemini Attempt 3 failed:', err3);

                    // Fallback: OpenAI
                    if (openAIKey) {
                        try {
                            const imageBase64 = await generateWithOpenAI(openAIKey, prompt);
                            return NextResponse.json({ image: imageBase64 });
                        } catch (errOpenAI) {
                            console.error('OpenAI Fallback failed:', errOpenAI);
                            // Final error catch below
                        }
                    } else {
                        console.warn('OpenAI Key not present for fallback.');
                    }

                    // If we reached here, everything failed.
                    return NextResponse.json(
                        { error: "I'm awake right now. Try again in a minute." },
                        { status: 500 }
                    );
                }
            }
        }

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: "I'm awake right now. Try again in a minute." },
            { status: 500 }
        );
    }
}
