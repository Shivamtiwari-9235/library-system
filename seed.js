import { getDatabase, getMongoClient } from "./lib/mongodb.js";
import { hashPassword } from "./lib/auth.js";

const books = [
  { title: "The Midnight Library", author: "Matt Haig", isbn: "9780525559474", category: "Fiction", description: "A thoughtful novel about regret, possibility, and the lives we might have lived.", copies: 3 },
  { title: "The Pragmatic Programmer", author: "David Thomas and Andrew Hunt", isbn: "9780135957059", category: "Computer Science", description: "Practical techniques for writing flexible, maintainable software.", copies: 3 },
  { title: "A Brief History of Time", author: "Stephen Hawking", isbn: "9780553380163", category: "Science", description: "An accessible exploration of cosmology, black holes, and the origins of the universe.", copies: 3 },
  { title: "Atomic Habits", author: "James Clear", isbn: "9780735211292", category: "Self-help", description: "A practical framework for building good habits and breaking unhelpful ones.", copies: 3 },
  { title: "Clean Code", author: "Robert C. Martin", isbn: "9780132350884", category: "Computer Science", description: "A guide to producing readable, maintainable, and professional software.", copies: 3 },
  { title: "The Design of Everyday Things", author: "Don Norman", isbn: "9780465050659", category: "Design", description: "A user-centred look at how thoughtful design makes everyday products easier to understand and use.", copies: 2 },
];
let client;

try {
  const database = await getDatabase();
  client = await getMongoClient();

  await database.collection("profiles").createIndex({ email: 1 }, { unique: true });
  await database.collection("books").createIndex({ isbn: 1 }, { unique: true });
  await database.collection("bookCopies").createIndex({ bookId: 1, copyNumber: 1 }, { unique: true });
  await database.collection("profiles").updateOne({ email: "librarian@library.com" }, { $set: { fullName: "Demo Librarian", email: "librarian@library.com", role: "librarian", passwordHash: hashPassword("admin123") } }, { upsert: true });
  await database.collection("profiles").updateOne({ email: "member@library.com" }, { $set: { fullName: "Demo Member", email: "member@library.com", role: "member", passwordHash: hashPassword("member123") } }, { upsert: true });
  for (const bookData of books) {
    const { title, author, isbn, category, description, copies } = bookData;
    const result = await database.collection("books").findOneAndUpdate({ isbn }, { $set: { title, author, isbn, category, description }, $setOnInsert: { createdAt: new Date() } }, { upsert: true, returnDocument: "after" });
    const book = result.value || result;
    await database.collection("bookCopies").bulkWrite(Array.from({ length: copies }, (_, index) => index + 1).map((copyNumber) => ({ updateOne: { filter: { bookId: book._id, copyNumber }, update: { $setOnInsert: { bookId: book._id, copyNumber, status: "available", heldForMemberId: null } }, upsert: true } })));
  }
  console.log("MongoDB catalog and demo accounts seeded.");
} catch (error) {
  console.error(`MongoDB seed failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (client) await client.close();
}
