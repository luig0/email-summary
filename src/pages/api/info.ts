import type { NextApiRequest, NextApiResponse } from 'next';
import type { AccountsGetRequest, CountryCode, InstitutionsGetByIdRequest } from 'plaid';

import * as messages from '@/lib/Messages';
import client from '@/lib/PlaidApiClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { access_token } = req.query;

    if (typeof access_token === 'string') {
      const info: { [key: string]: any } = {};

      const accountsGetRequest: AccountsGetRequest = {
        access_token: access_token,
      };

      const accountsGetResponse = await client.accountsGet(accountsGetRequest);
      const { accounts, item } = accountsGetResponse.data;

      const accountNames = accounts.map((a) => a.official_name);
      info.accountNames = accountNames;

      if (typeof item.institution_id === 'string') {
        console.log('item.institution_id:', item.institution_id);

        const institutionsGetByIdRequest: InstitutionsGetByIdRequest = {
          institution_id: item.institution_id,
          country_codes: ['US'] as CountryCode[],
        };
        const institutionsGetByIdResponse = await client.institutionsGetById(institutionsGetByIdRequest);
        console.log('institutionsGetByIdResponse.data:', institutionsGetByIdResponse.data);

        const institutionName = institutionsGetByIdResponse.data.institution.name;
        info.institutionName = institutionName;
      }

      return res.json(info);
    }
    return res.json({});
  } else {
    return res.status(405).send(messages.METHOD_NOT_ALLOWED);
  }
}
