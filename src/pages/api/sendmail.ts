import type { NextApiRequest, NextApiResponse } from 'next';

import * as db from '@/lib/database/Adapter';
import * as messages from '@/lib/Messages';
import { sendMail } from '@/lib/NodeMailer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const sessionToken = req.cookies['session-token'];

      if (!sessionToken) throw new Error(messages.SESSION_HAS_EXPIRED);

      await db.getSessionAndUser(sessionToken);

      const { to, subject, text } = req.body;

      console.log('req.body:', req.body);

      await sendMail(to, subject, text);

      res.status(200).send(messages.OK);
    } catch (error: any) {
      if (error.message === messages.SESSION_HAS_EXPIRED) res.status(401).send(messages.UNAUTHORIZED);
      else {
        console.log('sendmail.ts error:', error.message);

        res.status(500).send(messages.INTERNAL_SERVER_ERROR);
      }
    }
  } else {
    res.status(405).send(messages.METHOD_NOT_ALLOWED);
  }
}
