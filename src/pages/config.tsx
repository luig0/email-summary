import { GetServerSideProps } from 'next';
import Image from 'next/image';
import { useRouter } from 'next/router';
import styles from '@/styles/Config.module.css';
import { useEffect, useState } from 'react';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Table from 'react-bootstrap/Table';

import * as db from '@/lib/database/Adapter';
import LinkAccounts from '@/components/LinkAccounts';
import type { Institution } from './api/accounts';

interface HomeProps {
  username: string;
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
    return { props: { username } };
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
  const fetchResult = await fetch(`/api/accounts?access_token=${accessToken}`);
  console.log(await fetchResult.json());
};

const getTransactions = async (accessToken: string) => {
  const fetchResult = await fetch(`/api/transactions?access_token=${accessToken}`);
  console.log(await fetchResult.json());
};

const sendMail = async () => {
  const fetchResult = await fetch('/api/sendmail', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: 'jhcao.g1@gmail.com',
      subject: 'sending a test mail from email-summary',
      text: 'huzzah! nodemailer worked with gmail from my app!',
    }),
  });
};

const AccountsPanel = () => {
  useEffect(() => {
    (async () => {
      setIsLoading(true);

      const fetchResult = await fetch('/api/accounts');
      const institutions = await fetchResult.json();
      setData(institutions);

      setIsLoading(false);
    })();
  }, []);

  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState([]);

  return (
    <>
      <h2 className="p-0">
        Accounts
        {isLoading && (
          <>
            <span className={styles['loading-text']} style={{ fontSize: '16px' }}>
              &nbsp;&nbsp;Loading&nbsp;
            </span>
            <Image src="/loading.svg" alt="loading" width="16" height="16" />
          </>
        )}
      </h2>
      {data.length > 0 && (
        <>
          {data.map((ins: Institution, index) => {
            const accounts = ins.accounts;
            return (
              <div key={`ins-${index}`}>
                <Table bordered>
                  <thead>
                    <tr>
                      <td>{ins.name}</td>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((acc, accIndex) => (
                      <tr key={`acc-${index}-${accIndex}`}>
                        <td>{acc.official_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            );
          })}
        </>
      )}
    </>
  );
};

export default (props: HomeProps) => {
  const router = useRouter();

  return (
    <main className={styles.main}>
      <Container className="mt-5">
        <Row>
          <Col></Col>
          <Col xs={8}>
            <Row className="mb-5">
              <Col className="p-0">
                <h1>Hi, {props.username}! &nbsp;</h1>
              </Col>
              <Col className="text-end">
                <h2>
                  <Button
                    variant="light"
                    onClick={() => {
                      router.push('/logout');
                    }}
                  >
                    Sign out
                  </Button>
                  {/* <Link href="/logout">logout</Link> */}
                </h2>
              </Col>
            </Row>
            <Row>
              <AccountsPanel />
            </Row>
          </Col>
          <Col></Col>
        </Row>
        <Row className="mt-5">
          <Col></Col>
          <Col xs={8} className="text-center">
            <LinkAccounts />
            <br />
            <Button className="mt-2" onClick={sendMail}>
              Send test mail
            </Button>
          </Col>
          <Col></Col>
        </Row>
      </Container>
    </main>
  );
};
