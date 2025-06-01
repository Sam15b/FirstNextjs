import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { JsonObject } from '@/lib/generated/prisma/runtime/library';

export async function POST(req: Request) {
    const { Title, email } = await req.json();

    if (!Title || !email) {
        return NextResponse.json({ error: 'Missing Value from Response' }, { status: 400 });
    }

    console.log("Title:", Title);

    try {
        let user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const isJsonObject = (value: unknown): value is JsonObject =>
            typeof value === 'object' && value !== null && !Array.isArray(value);

        if (!isJsonObject(user.chats)) {
            return NextResponse.json({ error: 'Invalid chat format' }, { status: 500 });
        }

        const currentChats: JsonObject = { ...user.chats };

        if (!(Title in currentChats)) {
            return NextResponse.json({ error: 'Title not found in chats' }, { status: 404 });
        }

        // Delete the key-value pair
        delete currentChats[Title];

        // Update in DB
        const updatedUser = await prisma.user.update({
            where: { email },
            data: {
                chats: currentChats,
            },
        });

        return NextResponse.json({ success: true, message: 'Title deleted successfully', data: updatedUser });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}