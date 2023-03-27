import bcrypt from 'bcrypt';
import type { NextApiRequest, NextApiResponse } from 'next';

import * as db from '@/lib/database/Adapter';
import { SESSION_EXPIRY_PERIOD } from '@/Constants';
import * as messages from '@/lib/Messages';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { emailAddress, password } = req.body;

    if (!emailAddress || !password) res.status(400);

    try {
      const dbUser = await db.getDbUser(emailAddress);

      if (!dbUser) return res.status(401).send(messages.ACCESS_DENIED);

      const result = await bcrypt.compare(password, dbUser.password_hash);

      if (!result) return res.status(401).send(messages.ACCESS_DENIED);

      const expiresAt = new Date(Date.now() + SESSION_EXPIRY_PERIOD);
      const sessionToken = await db.createSession(emailAddress, expiresAt);
      res.setHeader(
        'set-cookie',
        `session-token=${sessionToken}; Expires=${expiresAt.toUTCString()}; Path=/; HttpOnly; SameSite=Strict`
      );

      return res.status(200).send(messages.OK);
    } catch (err) {
      console.log('login.ts error:', err);
      return res.status(500).send(messages.INTERNAL_SERVER_ERROR);
    }
  } else {
    return res.status(405).send(messages.METHOD_NOT_ALLOWED);
  }
}
