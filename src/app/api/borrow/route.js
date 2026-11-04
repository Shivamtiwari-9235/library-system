import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDatabase } from "@/lib/mongodb";
import { canBorrow, canIssueCopy, calculateDueDate } from "@/lib/business-logic";
import { readSession, SESSION_COOKIE } from "@/lib/auth";

export async function GET() {
  try {
    const session = readSession((await cookies()).get(SESSION_COOKIE)?.value);
    if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const database = await getDatabase();
    const filter = session.role === "librarian" ? {} : { memberId: session.id };
    const records = await database.collection("borrowRecords").find(filter).sort({ issuedAt: -1 }).toArray();
    const data = await Promise.all(records.map(async (record) => {
      const [book, member] = await Promise.all([
        database.collection("books").findOne({ _id: record.bookId }),
        database.collection("profiles").findOne({ _id: new (await import("mongodb")).ObjectId(record.memberId) }),
      ]);
      return { ...record, id: record._id.toString(), bookId: record.bookId.toString(), copyId: record.copyId.toString(), memberEmail: member?.email || "Member", title: book?.title || "Unknown book" };
    }));
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = readSession((await cookies()).get(SESSION_COOKIE)?.value);
    if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { copyId, memberId = session.id } = await request.json();
    if (session.role !== "librarian" && memberId !== session.id) return NextResponse.json({ error: "You can only borrow books for your own account." }, { status: 403 });
    if (!copyId || !/^[a-f\d]{24}$/i.test(copyId) || !/^[a-f\d]{24}$/i.test(memberId)) return NextResponse.json({ error: "A valid copy and member are required." }, { status: 400 });
    const database = await getDatabase();
    const { ObjectId } = await import("mongodb");
    const copy = await database.collection("bookCopies").findOne({ _id: new ObjectId(copyId) });
    if (!copy) return NextResponse.json({ error: "Copy not found." }, { status: 404 });
    const activeCount = await database.collection("borrowRecords").countDocuments({ memberId, returnedAt: null });
    if (!canBorrow(activeCount)) return NextResponse.json({ error: "Members can borrow at most 3 books at a time." }, { status: 409 });
    const access = canIssueCopy({ copyStatus: copy.status, memberId, heldForMemberId: copy.heldForMemberId });
    if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: 409 });
    const issuedAt = new Date();
    const record = { copyId: copy._id, bookId: copy.bookId, memberId, issuedAt, dueAt: calculateDueDate(issuedAt), returnedAt: null, overdueDays: 0, fineRupees: 0, finePaid: false };
    const update = await database.collection("bookCopies").updateOne({ _id: copy._id, status: copy.status }, { $set: { status: "borrowed", heldForMemberId: null } });
    if (!update.modifiedCount) return NextResponse.json({ error: "Copy is no longer available." }, { status: 409 });
    const result = await database.collection("borrowRecords").insertOne(record);
    return NextResponse.json({ data: { ...record, id: result.insertedId.toString() } }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
