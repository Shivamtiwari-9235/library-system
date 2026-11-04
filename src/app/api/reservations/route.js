import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDatabase } from "@/lib/mongodb";
import { canReserve } from "@/lib/business-logic";
import { readSession, SESSION_COOKIE } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function GET() {
  try {
    const session = readSession((await cookies()).get(SESSION_COOKIE)?.value);
    if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const database = await getDatabase();
    const filter = session.role === "librarian" ? {} : { memberId: session.id };
    const records = await database.collection("reservations").find(filter).sort({ reservedAt: 1 }).toArray();
    const data = await Promise.all(records.map(async (reservation) => {
      const book = await database.collection("books").findOne({ _id: reservation.bookId });
      return { ...reservation, id: reservation._id.toString(), bookId: reservation.bookId.toString(), title: book?.title || "Unknown book" };
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
    const { bookId, memberId = session.id } = await request.json();
    if (!bookId || !/^[a-f\d]{24}$/i.test(bookId) || !/^[a-f\d]{24}$/i.test(memberId)) return NextResponse.json({ error: "A valid book and member are required." }, { status: 400 });
    if (session.role !== "librarian" && memberId !== session.id) return NextResponse.json({ error: "You can only reserve books for your own account." }, { status: 403 });
    const database = await getDatabase();
    const objectBookId = new ObjectId(bookId);
    const [copies, existing] = await Promise.all([database.collection("bookCopies").find({ bookId: objectBookId }).toArray(), database.collection("reservations").findOne({ bookId: objectBookId, memberId, status: { $in: ["waiting", "held"] } })]);
    if (!canReserve({ availableCount: copies.filter((copy) => copy.status === "available").length, hasActiveReservation: Boolean(existing), holdsBook: false })) return NextResponse.json({ error: "Reservations require every copy to be checked out, with one active reservation per member." }, { status: 409 });
    const reservation = { bookId: objectBookId, memberId, reservedAt: new Date(), status: "waiting" };
    const result = await database.collection("reservations").insertOne(reservation);
    return NextResponse.json({ data: { ...reservation, id: result.insertedId.toString() } }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
