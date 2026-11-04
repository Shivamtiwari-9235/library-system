import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { createSession, SESSION_COOKIE, verifyPassword } from "@/lib/auth";

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    const database = await getDatabase();
    const user = await database.collection("profiles").findOne({ email: email?.trim().toLowerCase() });
    if (!user || !verifyPassword(password || "", user.passwordHash)) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    const response = NextResponse.json({ user: { id: user._id.toString(), email: user.email, role: user.role, fullName: user.fullName } });
    response.cookies.set(SESSION_COOKIE, createSession({ id: user._id.toString(), email: user.email, role: user.role }), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 604800, path: "/" });
    return response;
  } catch (error) {
    const isConfigurationError = error.message.includes("MONGODB_URI") || error.code === "EBADNAME" || error.code === "ENOTFOUND";
    return NextResponse.json({ error: isConfigurationError ? "MongoDB connection is invalid. Replace <cluster> and other placeholders with your real Atlas URI, then restart npm run dev." : "Unable to sign in right now." }, { status: isConfigurationError ? 503 : 500 });
  }
}
