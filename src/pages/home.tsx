import { GetServerSideProps } from 'next';

import * as db from '@/lib/database/Adapter';
import LinkAccounts from '@/components/LinkAccounts';
import { AccessTokenRecord } from '@/types';

interface HomeProps {
  username: string;
  records: AccessTokenRecord[];
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const sessionToken = req.cookies['session-token'];

  if (!sessionToken)
    return {
      redirect: {
        permanent: false,
        destination: '/',
      },
      props: {},
    };

  try {
    const { username } = await db.getSessionAndUser(sessionToken);
    const records = await db.getAccessTokens(username);
    return { props: { username, records } };
  } catch (error) {
    return {
      redirect: {
        permanent: false,
        destination: '/',
      },
      props: {},
    };
  }
};

const getInfo = async (accessToken: string) => {
  const fetchResult = await fetch(`/api/info?access_token=${accessToken}`);
  console.log(await fetchResult.json());
};

const getTransactions = async (accessToken: string) => {
  const fetchResult = await fetch(`/api/transactions?access_token=${accessToken}`);
  console.log(await fetchResult.json());
};

export default (props: HomeProps) => {
  return (
    <>
      <div>Hello from home.tsx! Logged in as {props.username}</div>
      <br />
      <LinkAccounts />
      <br />
      <table>
        <thead>
          <tr>
            <td>access_token</td>
            <td>date_created</td>
            <td>transactions</td>
            <td>info</td>
          </tr>
        </thead>
        <tbody>
          {props.records.map((r, index) => (
            <tr key={`access_token_${index}`}>
              <td>{r.access_token}</td>
              <td>{r.date_created}</td>
              <td>
                <a href="#" onClick={getTransactions.bind(null, r.access_token)}>
                  txs
                </a>
              </td>
              <td>
                <a href="#" onClick={getInfo.bind(null, r.access_token)}>
                  info
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};
