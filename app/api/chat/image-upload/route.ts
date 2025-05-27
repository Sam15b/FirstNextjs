import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const genAI = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
});

export async function POST(req: Request) {
    const body = await req.json();
    const { message,imageBase64, mimeType } = body;
    try {
        console.log("Message",message)
        console.log("mimeType", mimeType)

        if (!imageBase64 || !mimeType) {
            return NextResponse.json({ error: "Missing image data or MIME type" }, { status: 400 });
        }

        const result = await genAI.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [
                {
                    inlineData: {
                        mimeType,
                        data: imageBase64,
                    },
                },
                { text: message },
            ],
        });

        console.log("Generated Caption:", result.text);

        return NextResponse.json({ reply: result.text });
    } catch (error) {
        console.error("Image upload error:", error);
        return NextResponse.json({ error: "Failed to generate image caption" }, { status: 500 });
    }
}