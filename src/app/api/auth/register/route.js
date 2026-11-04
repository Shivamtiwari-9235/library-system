import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { createSession, hashPassword, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request) {
  try {
    const { name, email, password } = await request.json();
    if (!name?.trim() || !email?.trim() || !password || password.length < 6) return NextResponse.json({ error: "Name, email, and a password of at least 6 characters are required." }, { status: 400 });
    const database = await getDatabase();
    const profile = { fullName: name.trim(), email: email.trim().toLowerCase(), passwordHash: hashPassword(password), role: "member", createdAt: new Date() };
    const result = await database.collection("profiles").insertOne(profile);
    const response = NextResponse.json({ user: { id: result.insertedId.toString(), email: profile.email, role: profile.role, fullName: profile.fullName } }, { status: 201 });
    response.cookies.set(SESSION_COOKIE, createSession({ id: result.insertedId.toString(), email: profile.email, role: profile.role }), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 604800, path: "/" });
    return response;
  } catch (error) {
    const isConfigurationError = error.message.includes("MONGODB_URI") || error.code === "EBADNAME" || error.code === "ENOTFOUND";
    return NextResponse.json({ error: error.code === 11000 ? "An account with this email already exists." : isConfigurationError ? "MongoDB connection is invalid. Replace <cluster> and other placeholders with your real Atlas URI, then restart npm run dev." : "Unable to create the account right now." }, { status: error.code === 11000 ? 409 : isConfigurationError ? 503 : 500 });
  }
}
