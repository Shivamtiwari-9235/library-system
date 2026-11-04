import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDatabase } from "@/lib/mongodb";
import { readSession, SESSION_COOKIE } from "@/lib/auth";

export async function GET() {
  try {
    const session = readSession((await cookies()).get(SESSION_COOKIE)?.value);
    if (!session || session.role !== "librarian") return NextResponse.json({ error: "Librarian authentication required." }, { status: 403 });
    const database = await getDatabase();
    const members = await database.collection("profiles").find({ role: "member" }, { projection: { fullName: 1, email: 1 } }).sort({ fullName: 1 }).toArray();
    return NextResponse.json({ data: members.map((member) => ({ id: member._id.toString(), fullName: member.fullName, email: member.email })) });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
