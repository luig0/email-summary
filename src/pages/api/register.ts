import bcrypt from 'bcrypt';
import type { NextApiRequest, NextApiResponse } from 'next';

import * as db from '../../lib/database/Adapter';
import * as messages from '../../lib/Messages';

const SALT_ROUNDS = 12;
const SESSION_EXPIRY_PERIOD = 60 * 60 * 24 * 1000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { username, password, inviteCode } = req.body;

    if (!username || !password || !inviteCode) return res.status(400).send(messages.BAD_REQUEST);

    if (inviteCode !== 'word') return res.status(400).send(messages.BAD_REQUEST);

    try {
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const result = await db.createUser(username, passwordHash);

      if (result) {
        const sessionToken = await db.createSession(username, new Date(new Date().getTime() + SESSION_EXPIRY_PERIOD));
        res.setHeader('Authorization', `Bearer ${sessionToken}`);
        return res.status(200).send(messages.REGISTRATION_SUCCESSFUL);
      } else return res.status(500).send('');
    } catch (err: any) {
      if ((err.message = messages.USERNAME_ALREADY_TAKEN)) {
        return res.status(409).send(messages.USERNAME_ALREADY_TAKEN);
      } else {
        console.log('[register.ts] error:', err.message);
        return res.status(500).send(err.message);
      }
    }
  } else {
    return res.status(405).send(messages.METHOD_NOT_ALLOWED);
  }
}
