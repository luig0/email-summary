import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';

const DB_NAME = process.env.DB_NAME || 'emailsummary.db';
const DB_DIR = path.resolve(process.cwd(), 'database');
const DB_PATH = path.resolve(process.cwd(), 'database', DB_NAME);

if (process.env.PLAID_CLIENT_ID && !fs.existsSync(DB_DIR)) {
  // only create this directory if process.env.PLAID_CLIENT_ID is set
  // this prevents the GitHub Actions builder from creating a new database file and overwriting the existing prod db
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, async (err) => {
  if (err) {
    console.log('error connecting to db:', err);
    console.log('err DB_PATH:', DB_PATH);
  } else {
    console.log('successfully connected to db');

    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email_address TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        date_created TEXT NOT NULL,
        date_modified TEXT,
        is_daily INTEGER NOT NULL,
        is_weekly INTEGER NOT NULL,
        is_monthly INTEGER NOT NULL
      );
    `;

    await db.run(createUsersTable);

    const createSessionsTable = `
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        session_token TEXT NOT NULL UNIQUE,
        date_created TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `;

    await db.run(createSessionsTable);

    const createAccessTokensTable = `
      CREATE TABLE IF NOT EXISTS access_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        uuid TEXT UNIQUE NOT NULL,
        access_token TEXT NOT NULL,
        item_id TEXT NOT NULL,
        date_created TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `;

    await db.run(createAccessTokensTable);

    const createInstitutionsTable = `
      CREATE TABLE IF NOT EXISTS institutions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        institution_id TEXT UNIQUE NOT NULL,
        name TEXT,
        date_created TEXT NOT NULL
      );
    `;

    await db.run(createInstitutionsTable);

    const createAccountsTable = `
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        access_token_id INTEGER NOT NULL,
        account_id TEXT UNIQUE NOT NULL,
        name TEXT,
        official_name TEXT,
        mask TEXT,
        type TEXT,
        subtype TEXT,
        institution_id INTEGER,
        date_created TEXT NOT NULL,
        FOREIGN KEY (access_token_id) REFERENCES access_tokens(id),
        FOREIGN KEY (institution_id) REFERENCES institutions(id)
      );
    `;

    await db.run(createAccountsTable);
  }
});

export const run = (sql: string, params: (string | null)[] = []): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        console.log('Error running sql ' + sql);
        console.log(err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

export const all = (sql: string, params: (string | null)[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, results) => {
      if (err) {
        console.log('Error running sql ' + sql);
        console.log(err);
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
};

export const get = (sql: string, params: (string | null)[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, result) => {
      if (err) {
        console.log('Error running sql ' + sql);
        console.log(err);
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};
