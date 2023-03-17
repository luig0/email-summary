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

      if (!dbUser) return res.status(401).send('Access Denied');

      const result = await bcrypt.compare(password, dbUser.password_hash);

      if (!result) return res.status(401).send('Access Denied');

      return res.status(200).send('OK');
    } catch (err) {
      console.log('login.ts error:', err);
      return res.status(500).send('Server error');
    }
  } else {
    return res.status(405).send('Method Not Allowed');
  }
}
