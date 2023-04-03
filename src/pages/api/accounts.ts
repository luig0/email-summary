import type { NextApiRequest, NextApiResponse } from 'next';
import type { AccountsGetRequest, CountryCode, InstitutionsGetByIdRequest } from 'plaid';

import * as db from '@/lib/database/Adapter';
import * as messages from '@/lib/Messages';
import plaidClient from '@/lib/PlaidApiClient';

export interface AccountData {
  institution_id: string;
  name: string;
  accounts: Account[];
  access_token_uuid: string;
}

interface Account {
  mask: string | null;
  name: string;
  official_name: string | null;
  type: string;
  subtype: string | null;
  institution_id: string;
  uuid: string;
}

interface GetInstitutionResponse {
  institution_id: string;
  name: string;
}

const getAccounts = async (accessToken: string): Promise<Account[]> => {
  let dbAccounts = await db.getAccounts(accessToken);

  if (dbAccounts.length > 0) {
    const accounts: Account[] = [];

    for (const dbAccount of dbAccounts) {
      const account: Account = {
        ...dbAccount,
      };
      accounts.push(account);
    }

    return accounts;
  } else {
    const request: AccountsGetRequest = { access_token: accessToken };

    try {
      const response = await plaidClient.accountsGet(request);
      const plaidAccounts = response.data.accounts;
      const institution_id = response.data.item.institution_id || '';
      await getInstitution(institution_id); // create the db institution first so it can be referenced by db.createAccount

      for (const account of plaidAccounts) {
        const filteredAccount = {
          mask: account.mask,
          name: account.name,
          official_name: account.official_name,
          type: account.type,
          subtype: account.subtype,
          institution_id,
        };

        await db.createAccount({ ...filteredAccount, accessToken, account_id: account.account_id });
      }

      dbAccounts = await db.getAccounts(accessToken);

      const accounts: Account[] = [];

      for (const dbAccount of dbAccounts) {
        const account: Account = {
          ...dbAccount,
        };
        accounts.push(account);
      }

      return accounts;
    } catch (error: any) {
      // handle error
      console.log('plaid GET accounts error:', error.message);
      return [];
    }
  }
};

const getInstitution = async (institutionId: string | null | undefined): Promise<GetInstitutionResponse> => {
  if (!institutionId) throw new Error('no institution_id provided to getInstitution');

  const dbInstitution = await db.getInstitution(institutionId);
  let ins: GetInstitutionResponse = { institution_id: institutionId, name: '' };

  if (dbInstitution) {
    ins.name = dbInstitution.name;
  } else {
    const insRequest: InstitutionsGetByIdRequest = {
      institution_id: institutionId,
      country_codes: ['US'] as CountryCode[],
    };
    const insResponse = await plaidClient.institutionsGetById(insRequest);
    const institution = insResponse.data.institution;
    const institution_name = institution.name || '';

    ins.name = institution_name;

    try {
      await db.createInstitution(institutionId, institution_name);
    } catch (error: any) {
      console.log('plaid GET institutions, createInstitution error:', error.message);
    }
  }

  return ins;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const sessionToken = req.cookies['session-token'];

      if (!sessionToken) throw new Error(messages.SESSION_HAS_EXPIRED);

      const { email_address } = await db.getSessionAndUser(sessionToken);
      const accessTokenRecords = await db.getAccessTokens(email_address);

      const accountData: AccountData[] = [];

      for (const accessTokenRecord of accessTokenRecords) {
        let institution_id = '';
        const { access_token } = accessTokenRecord;

        const accounts = await getAccounts(access_token);

        if (accounts.length > 0) institution_id = accounts[0].institution_id;

        const institution = await getInstitution(institution_id);

        accountData.push({
          institution_id: institution.institution_id,
          name: institution.name,
          accounts,
          access_token_uuid: accessTokenRecord.uuid,
        });
      }

      res.json(accountData);
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
