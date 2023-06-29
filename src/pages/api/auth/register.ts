import bcrypt from 'bcrypt';
import type { NextApiRequest, NextApiResponse } from 'next';

import * as db from '@/common/utils/database/Adapter';
import { SESSION_EXPIRY_PERIOD } from '@/Constants';
import * as messages from '@/common/Messages';
import rateLimit from '@/lib/RateLimit';

const SALT_ROUNDS = 12;
const INVITE_CODE = process.env.INVITE_CODE;

const limiter = rateLimit({
  interval: 60 * 1000, // 60 seconds
  uniqueTokenPerInterval: 500, // Max 500 users per second
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!INVITE_CODE) throw new Error('unable to read invite code from environment variables!');

  try {
    await limiter.check(res, 6, JSON.stringify(req.headers['x-real-ip'])); // 6 requests per minute
  } catch (error) {
    return res.status(429).send(messages.RATE_LIMIT_EXCEEDED);
  }

  if (req.method === 'POST') {
    const { emailAddress, password, inviteCode } = req.body;

    if (!emailAddress || !password || !inviteCode) return res.status(400).send(messages.BAD_REQUEST);

    if (inviteCode !== INVITE_CODE) return res.status(400).send(messages.BAD_REQUEST);

    try {
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      await db.createUser(emailAddress, passwordHash);

      const expiresAt = new Date(Date.now() + SESSION_EXPIRY_PERIOD);
      const sessionToken = await db.createSession(emailAddress, expiresAt);

      res.setHeader(
        'set-cookie',
        `session-token=${sessionToken}; Expires=${expiresAt.toUTCString()}; Path=/; HttpOnly; SameSite=Strict`
      );

      return res.status(201).send(messages.CREATED);
    } catch (err: any) {
      if (err.message === messages.EMAIL_ALREADY_REGISTERED) {
        return res.status(409).send(messages.EMAIL_ALREADY_REGISTERED);
      } else {
        console.log('[register.ts] error:', err.message);
        return res.status(500).send(messages.INTERNAL_SERVER_ERROR);
      }
    }
  } else {
    return res.status(405).send(messages.METHOD_NOT_ALLOWED);
  }
}
