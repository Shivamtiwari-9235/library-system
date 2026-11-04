import { MongoClient } from "mongodb";

let clientPromise;

export function getMongoClient() {
  const uri = process.env.MONGODB_URI?.trim().replace(/^['"]|['"]$/g, "");
  if (!uri || uri.includes("<") || uri.includes(">")) {
    throw new Error("MONGODB_URI still contains a placeholder such as <cluster>. Replace it with the complete MongoDB Atlas connection string in .env.");
  }
  if (!/^mongodb(\+srv)?:\/\//.test(uri)) {
    throw new Error("MONGODB_URI must start with mongodb:// or mongodb+srv://.");
  }
  if (!clientPromise) {
    clientPromise = new MongoClient(uri, {
      tls: true,
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      appName: "library-system",
    }).connect().catch((error) => {
      clientPromise = undefined;
      if (error?.code === "ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR" || error?.message?.includes("SSL")) {
        throw new Error("MongoDB TLS handshake failed. Check Atlas Network Access/IP allowlist, then copy a fresh Node.js driver URI from Atlas.");
      }
      if (error?.name === "MongoServerSelectionError") {
        throw new Error("MongoDB server selection timed out. Check Atlas Network Access/IP allowlist and your connection string.");
      }
      throw error;
    });
  }
  return clientPromise;
}

export async function getDatabase() {
  const client = await getMongoClient();
  return client.db(process.env.MONGODB_DB || "library_system");
}
