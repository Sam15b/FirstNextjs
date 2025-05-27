// app/api/chat/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const genAI = new GoogleGenAI({
    apiKey: "AIzaSyBEu4P64iPzPDF8KQlUmhbzH7I4BEY4U4Q",
});

export async function POST(req: Request) {
    const { message, type } = await req.json();

    console.log("Message", message)
    console.log("type", type)

    try {

        if (type === 'deep_research') {
            console.log("checking type", type)
            const result = await genAI.models.generateContent({
                model: 'gemini-2.5-flash-preview-05-20',
                contents: message,
                config: {
                    thinkingConfig: {
                        includeThoughts: true,
                    },
                },
            });

            const responseParts = result.candidates?.[0]?.content?.parts ?? [];
            const thoughts: string[] = [];
            const answerParts: string[] = [];

            for (const part of responseParts) {
                if (!part.text) continue;

                if (part.thought) {
                    thoughts.push(part.text);
                } else {
                    answerParts.push(part.text);
                }
            }

            return NextResponse.json({
                thoughts: thoughts.join('\n'),
                reply: answerParts.join('\n'),
            });
        }

        if (type === 'reason') {
            console.log("checking type", type)
            const result = await genAI.models.generateContent({
                model: "gemini-2.5-flash-preview-05-20",
                contents: message,
            });

            console.log(result)

            return NextResponse.json({ reply: result.text });
        }

        // 🧠 Reasoning or general chat
        if (!type || type === 'none') {
            console.log("checking type", type)
            const result = await genAI.models.generateContent({
                model: 'gemini-2.0-flash', // or use 'gemini-1.5-pro' if needed
                contents: message,
            });

            console.log(result)

            return NextResponse.json({ reply: result.text });
        }

        if (type === 'create_image') {
            console.log("checking type", type)
            const result = await genAI.models.generateContent({
                model: "gemini-2.0-flash-preview-image-generation",
                contents: message,
                config: {
                    responseModalities: ['Text', 'Image'],
                },
            });

            const candidates = result?.candidates;

            if (!candidates || candidates.length === 0) {
                return NextResponse.json({ error: 'No response candidates from Gemini.' }, { status: 500 });
            }

            const firstCandidate = candidates[0];
            const contentParts = firstCandidate?.content?.parts;
            if (!contentParts || contentParts.length === 0) {
                return NextResponse.json({ error: 'No content parts found.' }, { status: 500 });
            }

            let replyText = "";
            let imageBase64: string | null = null;

            for (const part of contentParts) {
                if (part.text) {
                    replyText += part.text + "\n";
                } else if (part.inlineData?.data) {
                    imageBase64 = part.inlineData.data;
                }
            }
            console.log(imageBase64)
            return NextResponse.json({
                reply: replyText.trim(),
                image: imageBase64 ? `data:image/png;base64,${imageBase64}` : null,
            });
        }


        return NextResponse.json({ error: 'Invalid request type' }, { status: 400 });

    } catch (error: any) {
        console.error('Gemini API error:', error);
        return NextResponse.json({
            error: 'Failed to fetch Gemini response.',
            details: error.message || error
        }, { status: 500 });
    }
}
