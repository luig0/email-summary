import type { NextApiRequest, NextApiResponse } from 'next';
import type { Transaction, TransactionsGetRequest } from 'plaid';

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

const formatMoney = (num: number) =>
  num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

const getTransactionsTables = async (
  access_token: string,
  institution: InstitutionRecord,
  startDateString: string,
  endDateString: string
): Promise<string> => {
  const makeTable = (headers: string[], transactions: Transaction[], signFlipper: number) => {
    let txTotalNet = 0;

    if (transactions.length === 0) return '<div>No transactions.</div>';

    return `
      <table border="1" cellpadding="3" cellspacing="0" width="640">
        <thead>
          <tr style="background-color: #e6f2ff; font-weight: bold;">
            ${headers.map((header) => `<td>${header}</td>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${
            transactions.length > 0
              ? transactions
                  .map((t, index) => {
                    txTotalNet += signFlipper * t.amount;
                    return `
                      <tr ${index % 2 === 1 ? 'bgcolor="#f5f5f5"' : ''}>
                        <td width="15%">${t.date}</td>
                        <td>${t.pending ? '(<i>Pending</i>) ' : ''}${t.name}</td>
                        <td width="15%" align="right">${formatMoney(signFlipper * t.amount)}</td>
                      </tr>`;
                  })
                  .join('')
              : `
                  <tr>
                    <td colspan="3" align="center">No transactions.</td>
                  </tr>
              `
          }
          ${
            transactions.length > 0
              ? `
              <tr style="font-weight: bold;">
                <td>&nbsp;</td>
                <td align="right">Net</td>
                <td align="right">${formatMoney(txTotalNet)}</td>
              </tr>
            `
              : ''
          }
        </tbody>
      </table>
  `;
  };

  const getItemLastUpdate = async () => {
    try {
      const response = await plaidClient.itemGet({ access_token });
      const lastUpdate = response.data.status?.transactions?.last_successful_update;

      if (lastUpdate === undefined || lastUpdate === null) return '(failed to retrieve)';

      const lastUpdateMs = new Date(lastUpdate).getTime();
      const now = Date.now();
      const hoursSince = Math.floor((now - lastUpdateMs) / (1000 * 60 * 60));

      return `${hoursSince} hours ago`;
    } catch (err) {
      return '(failed to retrieve)';
    }
  };

  let emailBody = '';

  emailBody += `<h2 style="margin-bottom: 1px;">${institution.institution_name}</h2>`;

  const lastUpdate = await getItemLastUpdate();
  emailBody += `
    <div style="margin: 0px; font-style: italic; color: #606060">Plaid last refreshed transactions ${lastUpdate}.<br /><br /></div>
  `;

  for (const account_id of institution.account_ids) {
    const request: TransactionsGetRequest = {
      access_token: access_token,
      start_date: startDateString,
      end_date: endDateString,
      options: {
        account_ids: [account_id],
      },
    };

    const response = await plaidClient.transactionsGet(request);

    emailBody += `<h4 style="margin: 0px;"></h4>`;

    const accountBalance = response.data.accounts[0].balances.current ?? response.data.accounts[0].balances.available;
    const accountType = response.data.accounts[0].type;
    const signFlipper = accountType === 'credit' ? 1 : -1;
    emailBody += `
      <table border="0" cellpadding="3" cellspacing="0" width="640">
        <tbody>
          <tr>
            <td align="left" style="font-weight: bold;">
              ${response.data.accounts[0].name} (${response.data.accounts[0].mask})
            </td>
            <td align="right" style="font-weight: bold;">
              Balance: ${accountBalance !== null ? formatMoney(accountBalance) : 'Unavailable'}
            </td>
          </tr>
        </tbody>
      </table>
      ${makeTable(['Date', 'Description', 'Amount'], response.data.transactions, signFlipper)}
      <br /><br />
    `;

    await sleep(250);
  }

  return emailBody;
};

const sendDailyUpdate = async (sortedSubs: SortedSubscriptions, dateString: string | undefined): Promise<void> => {
  if (dateString === undefined) {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date
      .getDate()
      .toString()
      .padStart(2, '0')}`;
  }

  for (const [email_address, user] of Object.entries(sortedSubs)) {
    let to = email_address;

    let emailBody = `
      <h1 style="margin-bottom: 1px;">Daily Financial Summary</h1>
      <div style="margin: 0px; font-style: italic; color: #606060">
        Summary of transactions dated ${dateString}.
        <br />Provided by mailer.jhcao.net. Log in to change your preferences.
      </div>
    `;

    for (const [access_token, institution] of Object.entries(user)) {
      emailBody += await getTransactionsTables(access_token, institution, dateString, dateString);
    }

    if (to && emailBody) {
      await sendMail(to, `Daily Financial Summary, ${dateString}`, emailBody);
    }
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const auth = await checkAuth(req);
      let mailerData = auth.isCron ? await db.getMailerData() : await db.getMailerDataForUser(auth.emailAddress!);
      const sortedSubs = sortByEmailAndAccesToken(mailerData);
      const { period, dateString } = req.body;

      switch (period) {
        case 'daily':
          await sendDailyUpdate(sortedSubs, dateString);
          break;
        case 'weekly':
          break;
        default:
          return res.status(400).send(messages.BAD_REQUEST);
      }

      res.status(200).send(messages.OK);
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
