import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { cookies } from "next/headers";
import { readSession, SESSION_COOKIE } from "@/lib/auth";

async function currentSession() {
  return readSession((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function GET(request) {
  try {
    const query = new URL(request.url).searchParams.get("q")?.trim() || "";
    const database = await getDatabase();
    const filter = query ? { $or: [{ title: { $regex: query, $options: "i" } }, { author: { $regex: query, $options: "i" } }, { isbn: { $regex: query, $options: "i" } }] } : {};
    const books = await database.collection("books").find(filter).sort({ title: 1 }).toArray();
    const data = await Promise.all(books.map(async (book) => {
      const copies = await database.collection("bookCopies").find({ bookId: book._id }).toArray();
      return { ...book, id: book._id.toString(), book_copies: copies.map((copy) => ({ ...copy, id: copy._id.toString(), bookId: copy.bookId.toString() })) };
    }));
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await currentSession();
    if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    if (session.role !== "librarian") return NextResponse.json({ error: "Only librarians can add books." }, { status: 403 });
    const body = await request.json();
    const title = body.title?.trim(); const author = body.author?.trim(); const isbn = body.isbn?.trim(); const category = body.category?.trim(); const copyCount = Number(body.copyCount);
    if (!title || !author || !isbn || !category || !Number.isInteger(copyCount) || copyCount < 1 || copyCount > 100) return NextResponse.json({ error: "Title, author, ISBN, category, and 1–100 copies are required." }, { status: 400 });
    const database = await getDatabase();
    const result = await database.collection("books").insertOne({ title, author, isbn, category, description: body.description?.trim() || "", createdAt: new Date() });
    await database.collection("bookCopies").insertMany(Array.from({ length: copyCount }, (_, index) => ({ bookId: result.insertedId, copyNumber: index + 1, status: "available", heldForMemberId: null })));
    const copies = await database.collection("bookCopies").find({ bookId: result.insertedId }).toArray();
    return NextResponse.json({ data: { id: result.insertedId.toString(), title, author, isbn, category, book_copies: copies.map((copy) => ({ ...copy, id: copy._id.toString(), bookId: copy.bookId.toString() })) } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.code === 11000 ? "A book with this ISBN already exists." : error.message }, { status: error.code === 11000 ? 409 : 500 });
  }
}
