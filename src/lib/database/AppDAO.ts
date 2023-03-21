import path from 'path';
import sqlite3 from 'sqlite3';

const DB_NAME = process.env.DB_NAME || 'jointsummary.db';
const DB_PATH = path.resolve(process.cwd(), 'assets', DB_NAME);

const db = new sqlite3.Database(DB_PATH, async (err) => {
  if (err) {
    console.log('error connecting to db:', err);
    console.log('err DB_PATH:', DB_PATH);
  } else {
    console.log('successfully connected to db');

    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        date_created TEXT NOT NULL,
        date_modified TEXT
      );
    `;

    await db.run(createUsersTable);

    const createSessionsTable = `
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_token TEXT NOT NULL UNIQUE,
        user_id INTEGER NOT NULL,
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
        access_token TEXT NOT NULL,
        date_created TEXT NOT NULL,
        date_modified TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `;

    await db.run(createAccessTokensTable);
  }
});

export const run = (sql: string, params: (string | null)[] = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        console.log('Error running sql ' + sql);
        console.log(err);
        reject(err);
      } else {
        resolve({ id: this.lastID });
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
