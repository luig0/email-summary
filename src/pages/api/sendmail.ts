import type { NextApiRequest, NextApiResponse } from 'next';
import type { TransactionsGetRequest } from 'plaid';

import * as db from '@/lib/database/Adapter';
import type { GetMailerDataResponse } from '@/lib/database/Adapter';
import * as messages from '@/lib/Messages';
import { sendMail } from '@/lib/NodeMailer';
import plaidClient from '@/lib/PlaidApiClient';

type EmailAddress = string;
type AccessToken = string;

interface InstitutionRecord {
  institution_name: string;
  account_ids: string[];
}

type SortedSubscriptions = Record<EmailAddress, Record<AccessToken, InstitutionRecord>>;

interface CheckAuthResponse {
  isCron: boolean;
  emailAddress: string | null;
}

const checkAuth = async (req: NextApiRequest): Promise<CheckAuthResponse> => {
  if (req.headers['authorization']) {
    const authHeader = req.headers['authorization'];

    if (authHeader.indexOf('Bearer ') === -1) throw new Error(messages.UNAUTHORIZED);

    const bearerToken = authHeader.replace('Bearer ', '');

    if (bearerToken !== process.env.BEARER_TOKEN) throw new Error(messages.UNAUTHORIZED);

    return {
      isCron: true,
      emailAddress: null,
    };
  } else {
    const sessionToken = req.cookies['session-token'];

    if (!sessionToken) throw new Error(messages.SESSION_HAS_EXPIRED);

    const { email_address } = await db.getSessionAndUser(sessionToken);

    return {
      isCron: false,
      emailAddress: email_address,
    };
  }
};

const sortByEmailAndAccesToken = (subscriptionRecords: GetMailerDataResponse[]): SortedSubscriptions => {
  const emailSubs: SortedSubscriptions = {};

  for (const subRecord of subscriptionRecords) {
    const { email_address, institution_name, access_token, account_id } = subRecord;

    if (emailSubs.hasOwnProperty(email_address)) {
      const emailSub = emailSubs[email_address];

      if (emailSub.hasOwnProperty(access_token)) {
        emailSub[access_token].account_ids.push(account_id);
      } else {
        emailSub[access_token] = { institution_name, account_ids: [account_id] };
      }
    } else {
      emailSubs[email_address] = { [access_token]: { institution_name, account_ids: [account_id] } };
    }
  }

  return emailSubs;
};

const sendDailyUpdate = async (sortedSubs: SortedSubscriptions): Promise<void> => {
  let to;
  let emailBody = '';

  const date = new Date();
  date.setDate(date.getDate() - 5);
  const dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date
    .getDate()
    .toString()
    .padStart(2, '0')}`;

  for (const [email_address, user] of Object.entries(sortedSubs)) {
    to = email_address;

    // TODO: parallelize the requests
    for (const [access_token, institution] of Object.entries(user)) {
      emailBody += `<br>${institution.institution_name}`;

      for (const account_id of institution.account_ids) {
        const request: TransactionsGetRequest = {
          access_token: access_token,
          start_date: dateString,
          end_date: dateString,
          options: {
            account_ids: [account_id],
          },
        };

        const response = await plaidClient.transactionsGet(request);

        emailBody += `<br>${response.data.accounts[0].official_name} (${response.data.accounts[0].mask})`;

        emailBody += `
          <table border="1">
            <tbody>
              ${response.data.transactions.map(
                (t) => `<tr><td>${t.date}</td><td>${t.name}</td><td>${t.amount.toFixed(2)}</td></tr>`
              )}
            </tbody>
          </table>
        `;

        const transactions = response.data.transactions.map((t) => `${t.date} ${t.name} ${t.amount.toFixed(2)}`);

        emailBody += '<br>' + transactions.join('<br>') + '<br>';
      }
    }
  }

  if (to && emailBody) {
    await sendMail(to, 'test cron job', emailBody);
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const auth = await checkAuth(req);

      if (auth.isCron) {
        const mailerData = await db.getMailerData();
        const sortedSubs = sortByEmailAndAccesToken(mailerData);
        await sendDailyUpdate(sortedSubs);

        res.status(200).send(messages.OK);
      } else {
        const { to, subject, text } = req.body;
        await sendMail(to, subject, text);
        res.status(200).send(messages.OK);
      }
    } catch (error: any) {
      if (error.message === messages.SESSION_HAS_EXPIRED || error.message === messages.UNAUTHORIZED)
        res.status(401).send(messages.UNAUTHORIZED);
      else {
        console.log('sendmail.ts error:', error.message);
        res.status(500).send(messages.INTERNAL_SERVER_ERROR);
      }
    }
  } else {
    res.status(405).send(messages.METHOD_NOT_ALLOWED);
  }
}
