import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req) {
  try {
    const { userId, date } = await req.json();
    if (!userId || !date) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const entry = await prisma.preferredDate.create({
      data: { userId: Number(userId), date: new Date(date) },
    });
    return NextResponse.json(entry);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to add preferred date" }, { status: 500 });
  }
}
