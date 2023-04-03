import type { NextApiRequest, NextApiResponse } from 'next';
import type { Email, TransactionsGetRequest } from 'plaid';

import * as db from '@/lib/database/Adapter';
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

const sortByEmailAndAccesToken = (subscriptionRecords: SubscriptionRecord[]): SortedSubscriptions => {
  const emailSubs: SortedSubscriptions = {};

  for (const subRecord of subscriptionRecords) {
    const { email_address, access_token, account_id, name: institution_name } = subRecord;

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

const sendDailyUpdate = async (dailySubscriptions: SortedSubscriptions) => {
  let to;
  let emailBody = '';

  const date = new Date();
  date.setDate(date.getDate() - 1);
  const dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate()}`;
  console.log('dateString:', dateString);

  for (const [email_address, user] of Object.entries(dailySubscriptions)) {
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

        const transactions = response.data.transactions.map((t) => `${t.date} ${t.name} $${t.amount.toFixed(2)}`);

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
        let subscriptions = await db.getAllSubscriptions();

        const { update_period } = req.body;
        let sortedSubs;

        switch (update_period) {
          case 'daily':
            const dailySubscriptions = sortByEmailAndAccesToken(subscriptions.filter((s) => s.is_daily !== 0));
            await sendDailyUpdate(dailySubscriptions);
            break;
          case 'weekly':
            subscriptions = subscriptions.filter((s) => s.is_weekly !== 0);
            sortedSubs = sortByEmailAndAccesToken(subscriptions);
            break;
          case 'monthly':
            subscriptions = subscriptions.filter((s) => s.is_monthly !== 0);
            sortedSubs = sortByEmailAndAccesToken(subscriptions);
            break;
          default:
            subscriptions = [];
            break;
        }
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
