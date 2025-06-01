import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    const { Title, newTitle, email } = await req.json();

    if (!Title || !newTitle || !email) {
        return NextResponse.json({ error: 'Missing Value from Response' }, { status: 400 });
    }

    console.log("Title:", Title);
    console.log("Messages:", newTitle);

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
        const currentChats =  user.chats as Record<string, any>;

        
        if (!(Title in currentChats)) {
            return NextResponse.json({ error: 'Old title not found in chats' }, { status: 400 });
        }

        currentChats[newTitle] = currentChats[Title]; // Copy to new key
        delete currentChats[Title]; // Delete old key

        
       const updatedUser = await prisma.user.update({
            where: { email },
            data: {
                chats: currentChats,
            },
        });

        return NextResponse.json({ success: true, message: 'Title renamed successfully', data: updatedUser});

    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}