import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      include: {
        preferredDates: true,
        unavailability: true,
      },
    });

    return NextResponse.json({ rows: users });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { userId, date, type } = await req.json();

    if (!userId || !date || !type) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (type === "preferred") {
      const record = await prisma.preferredDate.create({
        data: { userId, date: new Date(date) },
      });
      return NextResponse.json({ message: "Preferred date added", record });
    }

    if (type === "unavailable") {
      const record = await prisma.userUnavailability.create({
        data: { userId, date: new Date(date) },
      });
      return NextResponse.json({ message: "Unavailable date added", record });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
