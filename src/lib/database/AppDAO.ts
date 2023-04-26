import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';

const DB_NAME = process.env.DB_NAME || 'emailsummary.db';
const DB_DIR = path.resolve(process.cwd(), 'database');
const DB_PATH = path.resolve(process.cwd(), 'database', DB_NAME);

if (process.env.PLAID_ENV && !fs.existsSync(DB_DIR)) {
  // only create this directory if process.env.PLAID_ENV is set
  // this prevents the GitHub Actions builder from creating a new database file and overwriting the existing prod db
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH);

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
