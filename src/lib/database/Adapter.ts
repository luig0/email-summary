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

interface CreateSubscriptionRequest {
  emailAddress: string;
  accessTokenUuid: string;
  accountUuid: string;
  isDaily: boolean;
  isWeekly: boolean;
  isMonthly: boolean;
}

export interface GetSubscriptionsResponse {
  is_daily: number;
  is_weekly: number;
  is_monthly: number;
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
          INSERT INTO users (email_address, password_hash, date_created, date_modified)
          VALUES (?, ?, ?, ?);
        `,
        [emailAddress, passwordHash, new Date().toISOString(), null]
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
        INSERT INTO access_tokens (user_id, uuid, access_token, item_id, date_created)
        VALUES (
          (SELECT id FROM users WHERE email_address=?),
          ?,
          ?,
          ?,
          ?
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
        SELECT uuid, access_token, item_id, date_created 
        FROM access_tokens 
        WHERE user_id=(SELECT id FROM users WHERE email_address=?)
      `,
      [emailAddress]
    );
  } catch (error: any) {
    console.log('Adapter.ts error:', error.message);
    throw new Error(messages.INTERNAL_SERVER_ERROR);
  }
}

export async function deleteAccessToken(uuid: string): Promise<void> {
  try {
    await dao.run(`DELETE FROM access_tokens WHERE uuid=?`, [uuid]);
  } catch (error: any) {
    console.log('Adapter.ts, deleteAccessToken error:', error.message);
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

export async function upsertSubscription({
  emailAddress,
  accessTokenUuid,
  accountUuid,
  isDaily,
  isWeekly,
  isMonthly,
}: CreateSubscriptionRequest) {
  try {
    await dao.run(
      `
      INSERT INTO subscriptions (
        user_id, access_token_id, account_id, is_daily, is_weekly, is_monthly, date_created, date_modified
      )
      VALUES (
        (SELECT id FROM users WHERE email_address=?),
        (SELECT id FROM access_tokens WHERE uuid=?),
        (SELECT id FROM accounts WHERE uuid=?),
        ?,
        ?,
        ?,
        ?,
        ?
      ) ON CONFLICT (account_id) DO UPDATE SET
        is_daily=excluded.is_daily,
        is_weekly=excluded.is_weekly,
        is_monthly=excluded.is_monthly,
        date_modified=excluded.date_created;
    `,
      [
        emailAddress,
        accessTokenUuid,
        accountUuid,
        isDaily ? '1' : '0',
        isWeekly ? '1' : '0',
        isMonthly ? '1' : '0',
        new Date().toISOString(),
        null,
      ]
    );
  } catch (error: any) {
    console.log('Adapter.ts, upsertSubscription error:', error.message);
    throw new Error(error.message);
  }
}

export async function getSubscriptionsForAccount(
  accessToken: string,
  accountUuid: string
): Promise<GetSubscriptionsResponse | undefined> {
  try {
    return await dao.get(
      `
      SELECT is_daily, is_weekly, is_monthly 
      FROM subscriptions
      WHERE
        access_token_id=(SELECT id FROM access_tokens WHERE access_token=?) AND
        account_id=(SELECT id FROM accounts WHERE uuid=?);
    `,
      [accessToken, accountUuid]
    );
  } catch (error: any) {
    console.log('Adapter.ts, getSubscriptionsForAccount error:', error.message);
    throw new Error(error.message);
  }
}
