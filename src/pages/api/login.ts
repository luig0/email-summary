import bcrypt from 'bcrypt';
import type { NextApiRequest, NextApiResponse } from 'next';

import * as db from '../../lib/AppDAO';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { username, password } = req.body;

    if (!username || !password) res.status(400);

    console.log('username:', username);

    try {
      const dbUser = await db.get('SELECT * FROM users WHERE username=?;', [username]);

      if (!dbUser) res.status(401).send('Access Denied');

      const result = await bcrypt.compare(password, dbUser.password_hash);

      if (!result) res.status(401).send('Access Denied');

      res.status(200).send('OK');
    } catch (err) {
      console.log('login.ts error:', err);
      res.status(500).send('Server error');
    }
  } else {
    res.status(405).send('Method Not Allowed');
  }
}
