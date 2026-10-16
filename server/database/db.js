
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);

const databasePath = path.join(currentDir, "libris.db");
const schemaPath = path.join(currentDir, "schema.sql");

const db = new Database(databasePath);

// Enable relational integrity and a sensible busy timeout.
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");

// Create tables and indexes from schema.sql.
const schema = fs.readFileSync(schemaPath, "utf8");
db.exec(schema);

console.log("📚 Libris SQLite database initialized.");

export default db;
