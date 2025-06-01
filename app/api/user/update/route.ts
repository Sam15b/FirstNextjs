import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    const { Title, messages, check, email } = await req.json();

    if (!Title || !messages || !email) {
        return NextResponse.json({ error: 'Missing Value from Response' }, { status: 400 });
    }

    console.log("Title:", Title);
    console.log("Messages:", messages);
    console.log("check:", check);

    function isJsonObject(value: unknown): value is Record<string, any> {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }

    try {
        let user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const currentChats = isJsonObject(user.chats) ? user.chats : {};

        let updatedChat;

            updatedChat = {
                ...currentChats,
                [Title]: messages,
            };

        const updatedUser = await prisma.user.update({
            where: { email },
            data: {
                chats: updatedChat,
            },
        });

        return NextResponse.json(updatedUser);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}