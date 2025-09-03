import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function DELETE(req, { params }) {
  try {
    const { id } = params;
    await prisma.userUnavailability.delete({
      where: { id: Number(id) },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete unavailability" }, { status: 500 });
  }
}
