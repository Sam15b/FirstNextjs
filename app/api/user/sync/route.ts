// app/api/user/sync/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const { fullName, email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: 'Missing email' }, { status: 400 });
  }

  console.log("Email",email)
  console.log("FullName",fullName)

  try {
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          fullName,
        },
      });
    }

    return NextResponse.json(user);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
