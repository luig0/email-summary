import type { NextApiRequest, NextApiResponse } from 'next';
import type { AccountsGetRequest, CountryCode, InstitutionsGetByIdRequest } from 'plaid';

import * as db from '@/lib/database/Adapter';
import * as messages from '@/lib/Messages';
import plaidClient from '@/lib/PlaidApiClient';

export interface Institution {
  institution_id: string;
  name: string;
  accounts: Account[];
}

interface Account {
  account_id: string;
  mask: string | null;
  name: string;
  official_name: string | null;
  type: string;
  subtype: string | null;
  institution_id: string | null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const sessionToken = req.cookies['session-token'];

      if (!sessionToken) throw new Error(messages.SESSION_HAS_EXPIRED);

      const { username } = await db.getSessionAndUser(sessionToken);
      const accessTokenRecords = await db.getAccessTokens(username);

      const institutions: Institution[] = [];

      for (const accessTokenRecord of accessTokenRecords) {
        let institution_id = '';
        let institution_name = '';
        const myAccounts: Account[] = [];
        const { access_token } = accessTokenRecord;

        const request: AccountsGetRequest = { access_token };
        try {
          const response = await plaidClient.accountsGet(request);
          const accounts = response.data.accounts;

          for (const account of accounts) {
            let dbInstitution;

            if (!institution_id) {
              institution_id = response.data.item.institution_id || '';

              try {
                if (!institution_name) {
                  dbInstitution = await db.getInstitution(institution_id);
                }

                if (dbInstitution) {
                  institution_name = dbInstitution.name;
                } else {
                  const insRequest: InstitutionsGetByIdRequest = {
                    institution_id,
                    country_codes: ['US'] as CountryCode[],
                  };
                  const insResponse = await plaidClient.institutionsGetById(insRequest);
                  const institution = insResponse.data.institution;
                  institution_name = institution.name || '';

                  try {
                    await db.createInstitution(institution_id, institution_name);
                  } catch (error: any) {
                    console.log('plaid GET institutions, createInstitution error:', error.message);
                  }
                }
              } catch (error: any) {
                // Handle error
                console.log('plaid GET institutions error:', error.message);
                institution_name = '';
              }
            }

            myAccounts.push({
              account_id: account.account_id,
              mask: account.mask,
              name: account.name,
              official_name: account.official_name,
              type: account.type,
              subtype: account.subtype,
              institution_id: account.institution_id,
            });
          }

          institutions.push({ institution_id, name: institution_name || '', accounts: myAccounts });
        } catch (error: any) {
          // handle error
          console.log('plaid GET accounts error:', error.message);
        }
      }

      res.json(institutions);
    } catch (error: any) {
      if (error.message === messages.SESSION_HAS_EXPIRED) res.status(401).send(messages.UNAUTHORIZED);
      else {
        console.log('accounts.ts error:', error.message);
        res.status(500).send(messages.INTERNAL_SERVER_ERROR);
      }
    }
  } else {
    res.status(405).send(messages.METHOD_NOT_ALLOWED);
  }
}
