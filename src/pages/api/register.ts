import bcrypt from 'bcrypt';
import type { NextApiRequest, NextApiResponse } from 'next';

import * as db from '../../lib/AppDAO';

const SALT_ROUNDS = 12;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { username, password, inviteCode } = req.body;

    console.log('req.body:', req.body);

    if (!username || !password || !inviteCode) res.status(400).send('Bad request');

    if (inviteCode !== 'hr*4osYv7NBM^@') res.status(400).send('Bad request');

    try {
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      await db.run(
        `
        INSERT INTO users (username, password_hash, date_created, date_modified)
        VALUES (?, ?, ?, ?);
      `,
        [username, passwordHash, new Date().toISOString(), null]
      );

      res.status(200).send('Registration successful');
    } catch (err) {
      console.log('register.ts error:', err);
      res.status(500).send('Registration error');
    }
  } else {
    res.status(405).send('Method Not Allowed');
  }
}
