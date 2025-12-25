import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60; // Allow longer timeout for image generation

export async function POST(req: NextRequest) {
    try {
        const { image, prompt } = await req.json();

        if (!prompt) {
            return NextResponse.json(
                { error: 'Missing prompt' },
                { status: 400 }
            );
        }

        const apiKey = process.env.GEMINI_IMAGE_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: 'Server configuration error: Missing API Key' },
                { status: 500 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-3-pro-image-preview' });

        // Construct the prompt for the "Nano Banana Pro"
        let systemInstruction = `
      You are a comic book artist in the style of Mike Mignola (Hellboy). 
      Create a single-page comic strip (6-9 panels) based on the dream description.
      
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

        // Note: ensure the model supports 'generateContent' with multimodal inputs for image generation
        const result = await model.generateContent(parts);
        const response = await result.response;

        console.log('Gemini response received.');

        // Typically, image generation models might return the image in the response parts.
        // We check for inlineData in the first part of the first candidate.
        // Adjusting for potential response structure differences.
        // If the library/model returns a specific 'images' field, we might need to handle that, 
        // but for 'generateContent', it usually comes back as a part.

        /* 
          ATTENTION: If the model returns multiple parts or a different structure for images, 
          this traversal might need adjustment. 
          Commonly for image gen models in this SDK: response.text() might be empty, but parts will have data.
        */

        // Let's try to find an image part
        const responseParts = response.candidates?.[0]?.content?.parts;
        const generatedImagePart = responseParts?.find(p => p.inlineData);

        if (generatedImagePart && generatedImagePart.inlineData) {
            return NextResponse.json({
                image: generatedImagePart.inlineData.data
            });
        }

        // Fallback: Check if it returned a textURL or something else? 
        // Sometimes it returns binary data directly if using REST, but SDK wraps it.

        console.warn('No inline image data found in response. Dump:', JSON.stringify(response));
        return NextResponse.json(
            { error: 'Failed to generate image. No image data returned.' },
            { status: 500 }
        );

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
