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

import { v4 as uuidv4 } from 'uuid';

import * as dao from '@/lib/database/AppDAO';
import * as messages from '@/lib/Messages';

export interface AccessTokenRecord {
  uuid: string;
  access_token: string;
  item_id: string;
  date_created: string;
  is_expired: number;
}

interface DbUser {
  email_address: string;
  password_hash: string;
}

interface GetSessionAndUserResponse {
  email_address: string;
  session_token: string;
  expires_at: string;
}

interface InstitutionRecord {
  institution_id: string;
  name: string;
}

interface CreateAccountRecordInput {
  accessToken: string;
  account_id: string;
  name: string | null;
  official_name: string | null;
  mask: string | null;
  type: string | null;
  subtype: string | null;
  institution_id: string;
}

interface GetAccountResponse {
  name: string;
  official_name: string;
  mask: string;
  type: string;
  subtype: string;
  institution_id: string;
  uuid: string;
}

export interface GetMailerDataResponse {
  email_address: string;
  institution_name: string;
  access_token: string;
  account_id: string;
}

function isSessionExpired(expiresAt: string): boolean {
  return Date.now() - new Date(expiresAt).getTime() > 0;
}

async function hasUser(emailAddress: string): Promise<boolean> {
  const result = await dao.get(`SELECT email_address FROM users WHERE email_address=?`, [emailAddress]);
  return !!result;
}

async function hasSessionToken(token: string): Promise<boolean> {
  return !!(await dao.get(`SELECT session_token FROM sessions WHERE session_token=?`, [token]));
}

export async function createUser(emailAddress: string, passwordHash: string): Promise<void> {
  if (!(await hasUser(emailAddress))) {
    try {
      await dao.run(
        `
          INSERT INTO users (email_address, password_hash, date_created, date_modified, is_daily, is_weekly, is_monthly)
          VALUES (?, ?, ?, ?, ?, ?, ?);
        `,
        [emailAddress, passwordHash, new Date().toISOString(), null, '0', '0', '0']
      );
    } catch (error: any) {
      console.log('Adapter.ts, createUser error:', error.message);
      throw new Error(error.message);
    }
  } else {
    throw new Error(messages.EMAIL_ALREADY_REGISTERED);
  }
}

export async function getDbUser(emailAddress: string): Promise<DbUser> {
  return await dao.get('SELECT email_address, password_hash FROM users WHERE email_address=?;', [emailAddress]);
}

export async function getUserId(emailAddress: string): Promise<number> {
  return await dao.get(`SELECT id FROM users WHERE email_address=?`, [emailAddress]);
}

export async function createSession(emailAddress: string, expiresAt: Date): Promise<string> {
  const expiresAtString = expiresAt.toISOString();
  let sessionToken = crypto.randomBytes(16).toString('base64');

  while (await hasSessionToken(sessionToken)) sessionToken = crypto.randomBytes(16).toString('base64');

  try {
    await dao.run(
      `
      INSERT INTO sessions (user_id, session_token, date_created, expires_at)
      VALUES (
        (SELECT id FROM users WHERE email_address=?),
        ?,
        ?,
        ?);
    `,
      [emailAddress, sessionToken, new Date().toISOString(), expiresAtString]
    );

    return sessionToken;
  } catch (error: any) {
    console.log('Adapter.ts, createSession error:', error);
    throw new Error(messages.INTERNAL_SERVER_ERROR);
  }
}

export async function getSessionAndUser(sessionToken: string): Promise<GetSessionAndUserResponse> {
  try {
    const result = await dao.get(
      `
        SELECT email_address, session_token, expires_at 
        FROM sessions, users 
        WHERE sessions.user_id = users.id AND session_token=?
      `,
      [sessionToken]
    );

    if (!result) throw new Error(messages.UNAUTHORIZED);

    if (isSessionExpired(result.expires_at)) throw new Error(messages.SESSION_HAS_EXPIRED);

    return result;
  } catch (error: any) {
    if (error.message === messages.SESSION_HAS_EXPIRED) throw new Error(messages.SESSION_HAS_EXPIRED);

    console.log('Adapter.ts, getSessionAndUser error:', error.message);
    throw new Error(messages.INTERNAL_SERVER_ERROR);
  }
}

export async function deleteSession(sessionToken: string): Promise<void> {
  try {
    await dao.run(`DELETE FROM sessions WHERE session_token=?`, [sessionToken]);
  } catch (error: any) {
    console.log('Adapter.ts error:', error.message);
    throw new Error(messages.INTERNAL_SERVER_ERROR);
  }
}

export async function createAccessToken(emailAddress: string, accessToken: string, itemId: string): Promise<void> {
  let uuid = uuidv4();

  // generate new uuid if this one is already used
  try {
    let result = await dao.get(`SELECT * FROM access_tokens WHERE uuid=?`, [uuid]);

    while (result) {
      uuid = uuidv4();
      result = await dao.get(`SELECT * FROM access_tokens WHERE uuid=?`, [uuid]);
    }
  } catch (error: any) {
    console.log('Adapter.ts, createAccessToken error:', error.message);
    throw new Error(error.message);
  }

  try {
    await dao.run(
      `
        INSERT INTO access_tokens (user_id, uuid, access_token, item_id, date_created, is_active, is_expired)
        VALUES (
          (SELECT id FROM users WHERE email_address=?),
          ?,
          ?,
          ?,
          ?,
          1,
          0
        );
    `,
      [emailAddress, uuid, accessToken, itemId, new Date().toISOString()]
    );
  } catch (error: any) {
    console.log('Adapter.ts, createAccessToken error:', error.message);
    throw new Error(error.message);
  }
}

export async function getAccessTokens(emailAddress: string): Promise<AccessTokenRecord[]> {
  try {
    return await dao.all(
      `
        SELECT uuid, access_token, item_id, date_created , is_expired
        FROM access_tokens 
        WHERE user_id=(SELECT id FROM users WHERE email_address=?) AND is_active = 1
      `,
      [emailAddress]
    );
  } catch (error: any) {
    console.log('Adapter.ts error:', error.message);
    throw new Error(messages.INTERNAL_SERVER_ERROR);
  }
}

export async function getAccessTokenByUuid(uuid: string): Promise<{ [key: string]: string }> {
  try {
    return await dao.get(`SELECT access_token FROM access_tokens WHERE uuid=?`, [uuid]);
  } catch (error: any) {
    console.log('Adapter.ts, getAccessTokenByUuid error:', error.message);
    throw new Error(error.message);
  }
}

export async function disableAccessTokenByUuid(uuid: string): Promise<void> {
  try {
    await dao.run(`UPDATE access_tokens SET is_active = 0 WHERE uuid=?`, [uuid]);
  } catch (error: any) {
    console.log('Adapter.ts, deleteAccessToken error:', error.message);
    throw new Error(error.message);
  }
}

export async function setAccessTokenIsExpired(accessToken: string, isExpired: boolean): Promise<void> {
  try {
    await dao.run(`UPDATE access_tokens SET is_expired = ? WHERE access_token=?`, [isExpired ? '1' : '0', accessToken]);
  } catch (error: any) {
    console.log('Adapter.ts, setAccessTokenIsExpired error:', error.message);
    throw new Error(error.message);
  }
}

export async function setAccessTokenIsExpiredByUuid(accessTokenUuid: string, isExpired: boolean): Promise<void> {
  try {
    await dao.run(`UPDATE access_tokens SET is_expired = ? WHERE access_token=?`, [isExpired ? '1' : '0', accessTokenUuid]);
  } catch (error: any) {
    console.log('Adapter.ts, setAccessTokenIsExpiredByUuid error:', error.message);
    throw new Error(error.message);
  }
}

export async function createInstitution(institutionId: string, institutionName: string) {
  try {
    await dao.run(
      `
        INSERT OR IGNORE INTO institutions (institution_id, name, date_created)
        VALUES (
          ?,
          ?,
          ?
        );
    `,
      [institutionId, institutionName, new Date().toISOString()]
    );
  } catch (error: any) {
    console.log('Adapter.ts, createInstitution error:', error.message);
    throw new Error(error.message);
  }
}

export async function getInstitution(institutionId: string): Promise<InstitutionRecord> {
  try {
    return await dao.get(
      `
        SELECT institution_id, name FROM institutions WHERE institution_id=?
      `,
      [institutionId]
    );
  } catch (error: any) {
    console.log('Adapter.ts, getInstitution error:', error.message);
    throw new Error(error.message);
  }
}

export async function createAccount(account: CreateAccountRecordInput) {
  let uuid = uuidv4();
  // generate new uuid if this one is already used
  try {
    let result = await dao.get(`SELECT * FROM accounts WHERE uuid=?`, [uuid]);

    while (result) {
      uuid = uuidv4();
      result = await dao.get(`SELECT * FROM accounts WHERE uuid=?`, [uuid]);
    }
  } catch (error: any) {
    console.log('Adapter.ts, createAccount error:', error.message);
    throw new Error(error.message);
  }

  const { accessToken, account_id, name, official_name, mask, type, subtype, institution_id } = account;

  try {
    await dao.run(
      `
      INSERT OR IGNORE INTO accounts (
        uuid, access_token_id, account_id, name, official_name, mask, type, subtype, institution_id, date_created
      )
      VALUES (
        ?,
        (SELECT id FROM access_tokens WHERE access_token=?),
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        (SELECT id FROM institutions WHERE institution_id=?),
        ?
      );
    `,
      [
        uuid,
        accessToken,
        account_id,
        name,
        official_name,
        mask,
        type,
        subtype,
        institution_id,
        new Date().toISOString(),
      ]
    );
  } catch (error: any) {
    console.log('Adapter.ts, createAccount error:', error.message);
    throw new Error(error.message);
  }
}

export async function getAccounts(accessToken: string): Promise<GetAccountResponse[]> {
  try {
    return await dao.all(
      `
        SELECT accounts.uuid, accounts.name, official_name, mask, type, subtype, institutions.institution_id
        FROM accounts, institutions
        WHERE accounts.institution_id = institutions.id AND access_token_id=(SELECT id FROM access_tokens WHERE access_token=?);
      `,
      [accessToken]
    );
  } catch (error: any) {
    console.log('Adapter.ts, getAccounts error:', error.message);
    throw new Error(error.message);
  }
}

export async function deleteAccounts(accessTokenUuid: string): Promise<void> {
  try {
    await dao.run(`DELETE FROM accounts WHERE access_token_id=(SELECT id FROM access_tokens WHERE uuid=?)`, [
      accessTokenUuid,
    ]);
  } catch (error: any) {
    console.log('Adapter.ts, deleteAccounts error:', error.message);
    throw new Error(error.message);
  }
}

export async function getMailerData(): Promise<GetMailerDataResponse[]> {
  try {
    return await dao.all(`
      SELECT
        users.email_address,
        institutions.name as institution_name,
        access_tokens.access_token,
        accounts.account_id
      FROM accounts
      LEFT JOIN access_tokens ON accounts.access_token_id = access_tokens.id
      LEFT JOIN institutions ON accounts.institution_id = institutions.id
      LEFT JOIN users ON access_tokens.user_id = users.id
      WHERE access_tokens.is_active = 1
      ORDER BY email_address, institution_name;
    `);
  } catch (error: any) {
    console.log('Adapter.ts, getMailerData error:', error.message);
    throw new Error(error.message);
  }
}

export async function getMailerDataForUser(emailAddress: string) {
  try {
    return await dao.all(
      `
      SELECT
        users.email_address,
        institutions.name as institution_name,
        access_tokens.access_token,
        accounts.account_id
      FROM accounts
      LEFT JOIN access_tokens ON accounts.access_token_id = access_tokens.id
      LEFT JOIN institutions ON accounts.institution_id = institutions.id
      LEFT JOIN users ON access_tokens.user_id = users.id
      WHERE users.email_address = ? AND access_tokens.is_active = 1
      ORDER BY email_address, institution_name;
    `,
      [emailAddress]
    );
  } catch (error: any) {
    console.log('Adapter.ts, getMailerData error:', error.message);
    throw new Error(error.message);
  }
}
