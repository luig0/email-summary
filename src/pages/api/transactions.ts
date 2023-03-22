import type { NextApiRequest, NextApiResponse } from 'next';
import type { TransactionsGetRequest } from 'plaid';

import * as messages from '@/lib/Messages';
import client from '@/lib/PlaidApiClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { access_token } = req.query;

    if (typeof access_token === 'string') {
      const request: TransactionsGetRequest = {
        access_token: access_token,
        start_date: '2018-01-01',
        end_date: '2020-02-01',
      };

      const result = await client.transactionsGet(request);
      return res.json(result.data.transactions);
    }
    return res.json([]);
  } else {
    return res.status(405).send(messages.METHOD_NOT_ALLOWED);
  }
}
