import type { NextApiRequest, NextApiResponse } from 'next';

import * as db from '@/lib/database/Adapter';
import * as messages from '@/lib/Messages';
import client from '@/lib/PlaidApiClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const publicToken = req.body.public_token;

    try {
      const plaidResponse = await client.itemPublicTokenExchange({
        public_token: publicToken,
      });

      // These values should be saved to a persistent database and
      // associated with the currently signed-in user
      const accessToken = plaidResponse.data.access_token;
      const itemId = plaidResponse.data.item_id;
      const sessionToken = req.cookies['session-token'];

      if (!sessionToken) throw new Error(messages.SESSION_HAS_EXPIRED);

      const { username } = await db.getSessionAndUser(sessionToken);
      await db.createAccessToken(username, accessToken, itemId);

      res.status(201).send(messages.CREATED);
    } catch (error) {
      res.status(500).send(messages.INTERNAL_SERVER_ERROR);
    }
  } else if (req.method === 'DELETE') {
    const uuid = req.query.uuid as string;

    try {
      await db.deleteAccessToken(uuid);
      res.status(204).send('');
    } catch (error) {
      res.status(500).send(messages.INTERNAL_SERVER_ERROR);
    }
  } else {
    res.status(405).send(messages.METHOD_NOT_ALLOWED);
  }
}
