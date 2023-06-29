import fs from 'fs';

import { createMocks } from 'node-mocks-http';

import { createTables } from '@/common/utils/database/AppDAO';
import * as db from '@/common/utils/database/Adapter';
import sendMailHandler from '@/pages/api/sendmail';
import plaidClient from '../../src/lib/PlaidApiClient';
import { sendMail } from '../../src/lib/NodeMailer';

jest.mock('../../src/lib/PlaidApiClient');
jest.mock('../../src/lib/NodeMailer');

describe('/api/sendmail', () => {
  beforeAll(async () => {
    await createTables();

    const emailUser1 = 'user1@testdomain.com';
    const emailUser2 = 'user2@testdomain.com';

    const accessToken1 = 'access-token-1';
    const accessToken2 = 'access-token-2';
    const accessToken3 = 'access-token-3';

    const institution0 = { id: 'ins_00', name: 'Aardvark Bank' };
    const institution1 = { id: 'ins_01', name: 'Beluga Bank' };
    const institution2 = { id: 'ins_02', name: 'Chimpanzee Bank' };

    // create two users
    await db.createUser(emailUser1, 'user1password');
    await db.createUser(emailUser2, 'user2password');

    // create institutions
    await db.createInstitution(institution0.id, institution0.name);
    await db.createInstitution(institution1.id, institution1.name);
    await db.createInstitution(institution2.id, institution2.name);

    // create access tokens
    await db.createAccessToken(emailUser1, accessToken1, 'item-id-001');
    await db.createAccessToken(emailUser1, accessToken2, 'item-id-002');
    await db.createAccessToken(emailUser2, accessToken3, 'item-id-003');

    // create accounts
    await db.createAccount({
      accessToken: accessToken1,
      account_id: 'aardvark-bank-account-001',
      name: 'Checking',
      official_name: 'Primary Checking',
      mask: '0000',
      type: 'depository',
      subtype: 'checking',
      institution_id: institution0.id,
    });

    await db.createAccount({
      accessToken: accessToken1,
      account_id: 'aardvark-bank-account-002',
      name: 'Savings',
      official_name: 'Primary Savings',
      mask: '0001',
      type: 'depository',
      subtype: 'savings',
      institution_id: institution0.id,
    });

    await db.createAccount({
      accessToken: accessToken2,
      account_id: 'beluga-bank-account-001',
      name: 'Credit Card',
      official_name: 'Beluga Diamond 12.5% APR Interest Credit Card',
      mask: '0002',
      type: 'credit',
      subtype: 'credit card',
      institution_id: institution1.id,
    });

    await db.createAccount({
      accessToken: accessToken3,
      account_id: 'chimpanzee-bank-account-001',
      name: 'Chimp Checking',
      official_name: 'Primary Chimp Checking',
      mask: '0003',
      type: 'depository',
      subtype: 'checking',
      institution_id: institution2.id,
    });

    await db.createAccount({
      accessToken: accessToken3,
      account_id: 'chimpanzee-bank-account-002',
      name: 'Chimp Savings',
      official_name: 'Primary Chimp Savings',
      mask: '0004',
      type: 'depository',
      subtype: 'savings',
      institution_id: institution2.id,
    });
  });

  afterAll(() => {
    fs.unlinkSync('./database/test.db');
  });

  it('should return a 405 for GET requests', async () => {
    const { req, res } = createMocks({ method: 'GET' });

    await sendMailHandler(req, res);

    expect(res._getStatusCode()).toBe(405);
  });

  it('should send two emails when two users have linked accounts', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.BEARER_TOKEN}`,
        'content-type': 'application/json',
      },
      body: { period: 'daily' },
    });

    (plaidClient.transactionsGet as jest.Mock).mockResolvedValue({
      data: {
        accounts: [{ balances: { current: 0, type: 'depository', name: 'Some account', mask: '0000' } }],
        transactions: [],
      },
    });

    (sendMail as jest.Mock).mockResolvedValue({});

    await sendMailHandler(req, res);

    expect(sendMail).toHaveBeenCalledTimes(2);
  });
});
