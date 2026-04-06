import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as bridge from "@/lib/bridge";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.bridgeCustomerId) {
      const customer = await bridge.getCustomer(user.bridgeCustomerId);
      return NextResponse.json(customer);
    }

    const customer = await bridge.createCustomer({
      full_name: user.name || user.email,
      email: user.email,
      type: "individual",
    });

    await prisma.user.update({
      where: { id: userId },
      data: { bridgeCustomerId: customer.id },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.bridgeCustomerId) {
      return NextResponse.json({ id: null, kyc_status: user?.kycStatus || "none" });
    }

    const customer = await bridge.getCustomer(user.bridgeCustomerId);
    return NextResponse.json(customer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
