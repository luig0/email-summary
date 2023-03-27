import type { NextApiRequest, NextApiResponse } from 'next';

import * as db from '@/lib/database/Adapter';
import * as messages from '@/lib/Messages';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const sessionToken = req.cookies['session-token'];

    if (!sessionToken) throw new Error(messages.SESSION_HAS_EXPIRED);

    try {
      const { email_address: emailAddress } = await db.getSessionAndUser(sessionToken);

      const { accessTokenUuid, accountUuid, isDaily, isWeekly, isMonthly } = req.body;

      if (!accessTokenUuid || !accountUuid || !isDaily || !isWeekly || !isMonthly) res.status(400);

      await db.upsertSubscription({
        emailAddress,
        accessTokenUuid,
        accountUuid,
        isDaily,
        isWeekly,
        isMonthly,
      });

      return res.status(200).send(messages.OK);
    } catch (error: any) {
      if (error.message === messages.SESSION_HAS_EXPIRED) res.status(401).send(messages.UNAUTHORIZED);
      else {
        console.log('POST subscription.ts error:', error.message);
        return res.status(500).send(messages.INTERNAL_SERVER_ERROR);
      }
    }
  } else {
    return res.status(405).send(messages.METHOD_NOT_ALLOWED);
  }
}
