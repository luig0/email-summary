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

import * as dao from './AppDAO';
import * as messages from '../Messages';

async function hasUser(username: string): Promise<boolean> {
  const result = await dao.get(`SELECT username FROM users WHERE username=?`, [username]);
  return !!result;
}

export async function createUser(username: string, passwordHash: string): Promise<boolean> {
  if (!(await hasUser(username))) {
    try {
      const result = await dao.run(
        `
          INSERT INTO users (username, password_hash, date_created, date_modified)
          VALUES (?, ?, ?, ?);
        `,
        [username, passwordHash, new Date().toISOString(), null]
      );

      return !!result;
    } catch (error) {
      console.log('Adapter.ts error:', error);
      throw new Error(messages.INTERNAL_SERVER_ERROR);
    }
  } else {
    throw new Error(messages.USERNAME_ALREADY_TAKEN);
  }
}
