import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import styles from '@/styles/Config.module.css';
import { useEffect, useState } from 'react';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Table from 'react-bootstrap/Table';
import Spinner from 'react-bootstrap/Spinner';
import ToggleButton from 'react-bootstrap/ToggleButton';
import ButtonGroup from 'react-bootstrap/ButtonGroup';

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

  const [daily, setDaily] = useState(false);
  const [weekly, setWeekly] = useState(false);
  const [monthly, setMonthly] = useState(false);

  return (
    <>
      <div>
        <span className="p-0 fs-1">Accounts</span>
        {isLoading && (
          <span className={styles['loading-text']} style={{ fontSize: '16px' }}>
            &nbsp;&nbsp;Loading&nbsp;
            <Spinner animation="border" variant="primary" size="sm" />
          </span>
        )}
      </div>

      {data.length > 0 && (
        <>
          {data.map((ins: Institution, index) => {
            const accounts = ins.accounts;
            return (
              <div key={`ins-${index}`} className="p-0">
                <Table bordered>
                  <thead>
                    <tr>
                      <td colSpan={2} className="ps-3 fs-3">
                        {ins.name}
                      </td>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((acc, accIndex) => (
                      <tr key={`acc-${index}-${accIndex}`}>
                        <td className="ps-5 align-middle">{acc.official_name}</td>
                        <td className="text-center">
                          <ButtonGroup size="sm">
                            <ToggleButton
                              id="toggle-daily"
                              type="checkbox"
                              variant="outline-primary"
                              checked={daily}
                              value="1"
                              onChange={(e) => setDaily(e.currentTarget.checked)}
                            >
                              Daily
                            </ToggleButton>
                            <ToggleButton
                              id="toggle-weekly"
                              type="checkbox"
                              variant="outline-primary"
                              checked={weekly}
                              value="1"
                              onChange={(e) => setWeekly(e.currentTarget.checked)}
                            >
                              Weekly
                            </ToggleButton>
                            <ToggleButton
                              id="toggle-monthly"
                              type="checkbox"
                              variant="outline-primary"
                              checked={monthly}
                              value="1"
                              onChange={(e) => setMonthly(e.currentTarget.checked)}
                            >
                              Monthly
                            </ToggleButton>
                          </ButtonGroup>
                          <Button className="m-1" onClick={sendMail} size="sm">
                            Send test mail
                          </Button>
                        </td>
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
                <LinkAccounts />
                <Button
                  variant="outline-danger"
                  className="ms-1"
                  onClick={() => {
                    router.push('/logout');
                  }}
                >
                  Sign out
                </Button>
              </Col>
            </Row>
            <Row>
              <AccountsPanel />
            </Row>
          </Col>
          <Col></Col>
        </Row>
      </Container>
    </main>
  );
};
