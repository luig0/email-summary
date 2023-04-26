// this file must be executed from project root (email-summary/)

import * as dao from '../lib/database/AppDAO';

(async () => {
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

  await dao.run(createUsersTable);

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

  await dao.run(createSessionsTable);

  const createAccessTokensTable = `
      CREATE TABLE IF NOT EXISTS access_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        uuid TEXT UNIQUE NOT NULL,
        access_token TEXT NOT NULL,
        item_id TEXT NOT NULL,
        date_created TEXT NOT NULL,
        is_active INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `;

  await dao.run(createAccessTokensTable);

  const createInstitutionsTable = `
      CREATE TABLE IF NOT EXISTS institutions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        institution_id TEXT UNIQUE NOT NULL,
        name TEXT,
        date_created TEXT NOT NULL
      );
    `;

  await dao.run(createInstitutionsTable);

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

  await dao.run(createAccountsTable);
})();
