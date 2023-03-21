// https://next-auth.js.org/tutorials/creating-a-database-adapter
//
// /** @return { import("next-auth/adapters").Adapter } */
// export default function MyAdapter(client, options = {}) {
//   return {
//     async createUser(user) {
//       return
//     },
//     async getUser(id) {
//       return
//     },
//     async getUserByEmail(email) {
//       return
//     },
//     async getUserByAccount({ providerAccountId, provider }) {
//       return
//     },
//     async updateUser(user) {
//       return
//     },
//     async deleteUser(userId) {
//       return
//     },
//     async linkAccount(account) {
//       return
//     },
//     async unlinkAccount({ providerAccountId, provider }) {
//       return
//     },
//     async createSession({ sessionToken, userId, expires }) {
//       return
//     },
//     async getSessionAndUser(sessionToken) {
//       return
//     },
//     async updateSession({ sessionToken }) {
//       return
//     },
//     async deleteSession(sessionToken) {
//       return
//     },
//     async createVerificationToken({ identifier, expires, token }) {
//       return
//     },
//     async useVerificationToken({ identifier, token }) {
//       return
//     },
//   }
// }

import crypto from 'crypto';

import * as dao from './AppDAO';
import * as messages from '../Messages';

async function hasUser(username: string): Promise<boolean> {
  const result = await dao.get(`SELECT username FROM users WHERE username=?`, [username]);
  return !!result;
}

export async function createUser(username: string, passwordHash: string): Promise<void> {
  if (!(await hasUser(username))) {
    try {
      await dao.run(
        `
          INSERT INTO users (username, password_hash, date_created, date_modified)
          VALUES (?, ?, ?, ?);
        `,
        [username, passwordHash, new Date().toISOString(), null]
      );
    } catch (error) {
      console.log('Adapter.ts error:', error);
      throw new Error(messages.INTERNAL_SERVER_ERROR);
    }
  } else {
    throw new Error(messages.USERNAME_ALREADY_TAKEN);
  }
}

export async function getDbUser(username: string) {
  return await dao.get('SELECT * FROM users WHERE username=?;', [username]);
}

async function hasSessionToken(token: string): Promise<boolean> {
  return !!(await dao.get(`SELECT session_token FROM sessions WHERE session_token=?`, [token]));
}

export async function createSession(username: string, expiresAt: Date): Promise<string> {
  const expiresAtString = expiresAt.toISOString();
  let sessionToken = crypto.randomBytes(16).toString('base64');

  while (await hasSessionToken(sessionToken)) sessionToken = crypto.randomBytes(16).toString('base64');

  try {
    await dao.run(
      `
      INSERT INTO sessions (user_id, session_token, date_created, expires_at)
      VALUES (
        (SELECT id FROM users WHERE username=?),
        ?,
        ?,
        ?);
    `,
      [sessionToken, username, new Date().toISOString(), expiresAtString]
    );

    return sessionToken;
  } catch (error: any) {
    console.log('Adapter.ts error:', error);
    throw new Error(messages.INTERNAL_SERVER_ERROR);
  }
}

export async function getSessionAndUser(sessionToken: string): Promise<{ [key: string]: string }> {
  try {
    const result = await dao.get(
      `
        SELECT username, session_token, expires_at 
        FROM sessions, users 
        WHERE sessions.user_id = users.id AND session_token=?
      `,
      [sessionToken]
    );

    if (!result || isSessionExpired(result.expires_at)) throw new Error(messages.SESSION_HAS_EXPIRED);

    return result;
  } catch (error: any) {
    if (error.message === messages.SESSION_HAS_EXPIRED) throw new Error(messages.SESSION_HAS_EXPIRED);

    console.log('Adapter.ts error:', error.message);
    throw new Error(messages.INTERNAL_SERVER_ERROR);
  }
}

export async function deleteSession(sessionToken: string) {
  try {
    await dao.run(`DELETE FROM sessions WHERE session_token=?`, [sessionToken]);
  } catch (error: any) {
    console.log('Adapter.ts error:', error.message);
    throw new Error(messages.INTERNAL_SERVER_ERROR);
  }
}
