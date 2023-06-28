import type { NextApiRequest, NextApiResponse } from 'next';
import { CountryCode, LinkTokenCreateRequest, LinkTokenCreateResponse, Products } from 'plaid';

import * as db from '@/lib/database/Adapter';
import client from '@/lib/PlaidApiClient';
import * as messages from '@/lib/Messages';

// PLAID_PRODUCTS is a comma-separated list of products to use when initializing
// Link. Note that this list must contain 'assets' in order for the app to be
// able to create and retrieve asset reports.
const PLAID_PRODUCTS = (process.env.PLAID_PRODUCTS || Products.Transactions).split(',') as Products[];

// PLAID_COUNTRY_CODES is a comma-separated list of countries for which users
// will be able to select institutions from.
const PLAID_COUNTRY_CODES = (process.env.PLAID_COUNTRY_CODES || 'US').split(',') as CountryCode[];

// Parameters used for the OAuth redirect Link flow.
//
// Set PLAID_REDIRECT_URI to 'http://localhost:3000'
// The OAuth redirect flow requires an endpoint on the developer's website
// that the bank website should redirect to. You will need to configure
// this redirect URI for your client ID through the Plaid developer dashboard
// at https://dashboard.plaid.com/team/api.
const PLAID_REDIRECT_URI = process.env.PLAID_REDIRECT_URI || '';

export default async function handler(req: NextApiRequest, res: NextApiResponse<LinkTokenCreateResponse | string>) {
  if (req.method === 'POST') {
    const sessionToken = req.cookies['session-token'];

    if (sessionToken) {
      try {
        const { email_address } = await db.getSessionAndUser(sessionToken);
        const id = await db.getUserId(email_address);
        const configs: LinkTokenCreateRequest = {
          user: {
            // This should correspond to a unique id for the current user.
            client_user_id: id.toString(),
          },
          client_name: 'Transactions Email Summary',
          products: PLAID_PRODUCTS,
          country_codes: PLAID_COUNTRY_CODES,
          language: 'en',
        };

        if (PLAID_REDIRECT_URI !== '') {
          configs.redirect_uri = PLAID_REDIRECT_URI;
        }

        if (req.body !== undefined) {
          if (req.body.access_token_uuid !== undefined && typeof req.body.access_token_uuid === 'string') {
            const dbToken = await db.getAccessTokenByUuid(req.body.access_token_uuid);
            configs.access_token = dbToken.access_token;
          }
        }

        const createTokenResponse = await client.linkTokenCreate(configs);
        res.json(createTokenResponse.data);
      } catch (error: any) {
        switch (error.message) {
          case messages.UNAUTHORIZED:
          case messages.SESSION_HAS_EXPIRED:
            res.status(401).send(messages.UNAUTHORIZED);
            break;
          default:
            console.log('[/api/create_link_token] error:', error);
            res.status(500).send(messages.INTERNAL_SERVER_ERROR);
            break;
        }
      }
    } else res.status(401).send(messages.UNAUTHORIZED);
  } else {
    res.status(405).send('Method Not Allowed');
  }
}
