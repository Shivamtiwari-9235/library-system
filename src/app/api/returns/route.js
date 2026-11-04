import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDatabase } from "@/lib/mongodb";
import { calculateFine } from "@/lib/business-logic";
import { readSession, SESSION_COOKIE } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function POST(request) {
  try {
    const session = readSession((await cookies()).get(SESSION_COOKIE)?.value);
    if (!session || session.role !== "librarian") return NextResponse.json({ error: "Librarian authentication required." }, { status: 403 });
    const { borrowId } = await request.json();
    const database = await getDatabase();
    const borrow = await database.collection("borrowRecords").findOne({ _id: new ObjectId(borrowId), returnedAt: null });
    if (!borrow) return NextResponse.json({ error: "Active borrowing not found." }, { status: 404 });
    const returnedAt = new Date();
    const { overdueDays, fine } = calculateFine(borrow.dueAt, returnedAt);
    const reservation = await database.collection("reservations").findOneAndUpdate({ bookId: borrow.bookId, status: "waiting" }, { $set: { status: "held", heldCopyId: borrow.copyId, holdExpiresAt: new Date(returnedAt.getTime() + 48 * 60 * 60 * 1000) } }, { sort: { reservedAt: 1 }, returnDocument: "after" });
    await database.collection("borrowRecords").updateOne({ _id: borrow._id }, { $set: { returnedAt, overdueDays, fineRupees: fine } });
    await database.collection("bookCopies").updateOne({ _id: borrow.copyId }, reservation ? { $set: { status: "reserved_held", heldForMemberId: reservation.memberId } } : { $set: { status: "available", heldForMemberId: null } });
    return NextResponse.json({ overdueDays, fine, status: reservation ? "reserved_held" : "available" });
  } catch (error) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
