import { MongoClient, type Db } from "mongodb";
import { env } from "../env.js";

let client: MongoClient | undefined;
let db: Db | undefined;

export async function connectMongo(): Promise<Db> {
  if (db) return db;
  client = new MongoClient(env.mongoUri);
  await client.connect();
  db = client.db(env.mongoDb);
  return db;
}

export function getDb(): Db {
  if (!db) {
    throw new Error("Mongo not connected yet — call connectMongo() at startup first.");
  }
  return db;
}
