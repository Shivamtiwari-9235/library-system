import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSession, SESSION_COOKIE } from "@/lib/auth";

export async function GET() {
  const session = readSession((await cookies()).get(SESSION_COOKIE)?.value);
  return NextResponse.json({ user: session });
}
