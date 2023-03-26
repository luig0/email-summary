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
      setAccountData(institutions);

      setDaily(institutions.map((ins: Institution) => ins.accounts.map((acc) => false)));
      setWeekly(institutions.map((ins: Institution) => ins.accounts.map((acc) => false)));
      setMonthly(institutions.map((ins: Institution) => ins.accounts.map((acc) => false)));

      setIsLoading(false);
    })();
  }, []);

  const [isLoading, setIsLoading] = useState(false);
  const [accountData, setAccountData] = useState([]);

  const [daily, setDaily] = useState<boolean[][]>();
  const [weekly, setWeekly] = useState<boolean[][]>();
  const [monthly, setMonthly] = useState<boolean[][]>();

  return (
    <>
      <table>
        <tbody>
          <tr>
            <td>
              <span className="p-2 fs-2">Accounts</span>
              {isLoading && (
                <span className={styles['loading-text']} style={{ fontSize: '16px' }}>
                  &nbsp;&nbsp;Loading&nbsp;
                  <Spinner animation="border" variant="primary" size="sm" />
                </span>
              )}
            </td>
            <td className="text-end">
              {!isLoading && (
                <Button className="m-1" onClick={sendMail} size="sm">
                  Send test mail
                </Button>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {accountData.length > 0 && (
        <>
          {accountData.map((ins: Institution, insIndex) => {
            const accounts = ins.accounts;
            return (
              <div key={`ins-${insIndex}`} className="p-0">
                <Table bordered>
                  <thead>
                    <tr>
                      <td className="ps-3 fs-4 border-end-0">{ins.name}</td>
                      <td className="align-middle text-end border-start-0">
                        <Button variant="danger" size="sm">
                          Delete
                        </Button>
                      </td>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((acc, accIndex) => {
                      return (
                        <tr key={`acc-${insIndex}-${accIndex}`}>
                          <td className="ps-5 align-middle border-end-0">{acc.official_name}</td>
                          <td className="text-center border-start-0">
                            <ButtonGroup size="sm">
                              <ToggleButton
                                id={`toggle-daily-${insIndex}-${accIndex}`}
                                type="checkbox"
                                variant="outline-primary"
                                checked={daily![insIndex][accIndex]}
                                value="d"
                                onChange={(e) => {
                                  const newDaily = JSON.parse(JSON.stringify(daily));
                                  newDaily![insIndex][accIndex] = e.currentTarget.checked;
                                  setDaily(newDaily);
                                }}
                              >
                                Daily
                              </ToggleButton>
                              <ToggleButton
                                id={`toggle-weekly-${insIndex}-${accIndex}`}
                                type="checkbox"
                                variant="outline-primary"
                                checked={weekly![insIndex][accIndex]}
                                value="w"
                                onChange={(e) => {
                                  const newWeekly = JSON.parse(JSON.stringify(weekly));
                                  newWeekly![insIndex][accIndex] = e.currentTarget.checked;
                                  setWeekly(newWeekly);
                                }}
                              >
                                Weekly
                              </ToggleButton>
                              <ToggleButton
                                id={`toggle-monthly-${insIndex}-${accIndex}`}
                                type="checkbox"
                                variant="outline-primary"
                                checked={monthly![insIndex][accIndex]}
                                value="m"
                                onChange={(e) => {
                                  const newMonthly = JSON.parse(JSON.stringify(monthly));
                                  newMonthly![insIndex][accIndex] = e.currentTarget.checked;
                                  setMonthly(newMonthly);
                                }}
                              >
                                Monthly
                              </ToggleButton>
                            </ButtonGroup>

                            <Button
                              variant="outline-dark"
                              className="m-1"
                              onClick={() => {
                                const newState = !daily![insIndex][accIndex];

                                const newDaily = JSON.parse(JSON.stringify(daily));
                                newDaily![insIndex][accIndex] = newState;
                                setDaily(newDaily);

                                const newWeekly = JSON.parse(JSON.stringify(weekly));
                                newWeekly![insIndex][accIndex] = newState;
                                setWeekly(newWeekly);

                                const newMonthly = JSON.parse(JSON.stringify(monthly));
                                newMonthly![insIndex][accIndex] = newState;
                                setMonthly(newMonthly);
                              }}
                              size="sm"
                            >
                              Toggle All
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
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
