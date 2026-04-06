import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as bridge from "@/lib/bridge";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.bridgeCustomerId) {
      return NextResponse.json({ data: [] });
    }

    const cards = await bridge.getCardAccounts(user.bridgeCustomerId);
    return NextResponse.json(cards);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.bridgeCustomerId) {
      return NextResponse.json({ error: "No Bridge customer linked" }, { status: 400 });
    }

    const body = await req.json();
    const card = await bridge.provisionCard(user.bridgeCustomerId, body);
    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
