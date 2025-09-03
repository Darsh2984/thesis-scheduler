import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(req, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    if (!id || !type) {
      return NextResponse.json({ error: "Missing id or type" }, { status: 400 });
    }

    if (type === "preferred") {
      await prisma.preferredDate.delete({ where: { id: Number(id) } });
      return NextResponse.json({ message: "Preferred date removed" });
    }

    if (type === "unavailable") {
      await prisma.userUnavailability.delete({ where: { id: Number(id) } });
      return NextResponse.json({ message: "Unavailable date removed" });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
