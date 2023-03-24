import { GetServerSideProps } from 'next';
import Link from 'next/link';
import styles from '@/styles/Config.module.css';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import * as db from '@/lib/database/Adapter';
import LinkAccounts from '@/components/LinkAccounts';
import { AccessTokenRecord } from '@/lib/database/Adapter';

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
    <main className={styles.main}>
      <Container className="mt-5">
        <Row>
          <Col></Col>
          <Col xs={8}>
            <div>
              <h2>
                Logged in as {props.username} (<Link href="/logout">logout</Link>)
              </h2>
            </div>
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
          </Col>
          <Col></Col>
        </Row>
        <Row className="mt-5">
          <Col></Col>
          <Col xs={8} className="text-center">
            <LinkAccounts />
          </Col>
          <Col></Col>
        </Row>
      </Container>
    </main>
  );
};