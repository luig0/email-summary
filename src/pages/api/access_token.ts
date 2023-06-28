import type { NextApiRequest, NextApiResponse } from 'next';
import type { ItemRemoveRequest } from 'plaid';

import * as db from '@/lib/database/Adapter';
import * as messages from '@/lib/Messages';
import plaidClient from '@/lib/PlaidApiClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const publicToken = req.body.public_token;

    try {
      const sessionToken = req.cookies['session-token'];
      if (!sessionToken) throw new Error(messages.SESSION_HAS_EXPIRED);
      const { email_address } = await db.getSessionAndUser(sessionToken);

      if (req.body.access_token_uuid !== undefined) {
        // update oauth (https://plaid.com/docs/link/update-mode/)

        await db.setAccessTokenIsExpiredByUuid(req.body.access_token_uuid, false);
        res.status(204).send(messages.NO_CONTENT);
      } else {
        // add new account

        const plaidResponse = await plaidClient.itemPublicTokenExchange({
          public_token: publicToken,
        });

        // These values should be saved to a persistent database and
        // associated with the currently signed-in user
        const accessToken = plaidResponse.data.access_token;
        const itemId = plaidResponse.data.item_id;
        await db.createAccessToken(email_address, accessToken, itemId);

        res.status(201).send(messages.CREATED);
      }
    } catch (error) {
      res.status(500).send(messages.INTERNAL_SERVER_ERROR);
    }
  } else if (req.method === 'DELETE') {
    const accessTokenUuid = req.query.uuid as string;

    try {
      const { access_token: accessToken } = await db.getAccessTokenByUuid(accessTokenUuid);
      const request: ItemRemoveRequest = { access_token: accessToken };
      await plaidClient.itemRemove(request);

      await db.deleteAccounts(accessTokenUuid);
      await db.disableAccessTokenByUuid(accessTokenUuid);
      res.status(204).send('');
    } catch (error: any) {
      console.log(`DELETE /api/access_token error:`, error.message);
      res.status(500).send(messages.INTERNAL_SERVER_ERROR);
    }
  } else {
    res.status(405).send(messages.METHOD_NOT_ALLOWED);
  }
}
