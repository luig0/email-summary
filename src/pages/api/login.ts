import bcrypt from 'bcrypt';
import type { NextApiRequest, NextApiResponse } from 'next';

import * as db from '../../lib/database/AppDAO';
import * as messages from '../../lib/Messages';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { username, password } = req.body;

    if (!username || !password) res.status(400);

    console.log('username:', username);

    try {
      const dbUser = await db.get('SELECT * FROM users WHERE username=?;', [username]);

      if (!dbUser) return res.status(401).send(messages.ACCESS_DENIED);

      const result = await bcrypt.compare(password, dbUser.password_hash);

      if (!result) return res.status(401).send(messages.ACCESS_DENIED);

      return res.status(200).send('OK');
    } catch (err) {
      console.log('login.ts error:', err);
      return res.status(500).send(messages.INTERNAL_SERVER_ERROR);
    }
  } else {
    return res.status(405).send(messages.METHOD_NOT_ALLOWED);
  }
}
