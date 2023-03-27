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
import type { AccountData } from './api/accounts';

interface HomeProps {
  emailAddress: string;
}

interface AccountsPanelProps {
  isLoading: boolean;
  data: AccountData[];
  fetchAccounts: () => void;
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
    const { email_address } = await db.getSessionAndUser(sessionToken);
    return { props: { emailAddress: email_address } };
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

const removeAccessToken = async (accessTokenUuid: string, fetchAccounts: () => void) => {
  const fetchResult = await fetch(`/api/access_token?uuid=${accessTokenUuid}`, { method: 'DELETE' });
  if (fetchResult.ok) await fetchAccounts();
};

const updateSubscription = async (
  accessTokenUuid: string,
  accountUuid: string,
  isDaily: boolean,
  isWeekly: boolean,
  isMonthly: boolean
): Promise<void> => {
  const fetchResult = await fetch('/api/update-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessTokenUuid, accountUuid, isDaily, isWeekly, isMonthly }),
  });
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

const AccountsPanel = (props: AccountsPanelProps) => {
  useEffect(() => {
    setAccountData(props.data);
    setDaily(props.data.map((ins: AccountData) => ins.accounts.map((acc) => false)));
    setWeekly(props.data.map((ins: AccountData) => ins.accounts.map((acc) => false)));
    setMonthly(props.data.map((ins: AccountData) => ins.accounts.map((acc) => false)));
  }, [props.data]);

  const { isLoading, fetchAccounts } = props;
  const [accountData, setAccountData] = useState(props.data);

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
          {accountData.map((ins: AccountData, insIndex) => {
            const accounts = ins.accounts;
            return (
              <div key={`ins-${insIndex}`} className="p-0">
                <Table bordered>
                  <thead>
                    <tr>
                      <td className="ps-3 fs-4 border-end-0">{ins.name}</td>
                      <td className="align-middle text-end border-start-0">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={removeAccessToken.bind(null, ins.access_token_uuid, fetchAccounts)}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((acc, accIndex) => {
                      return (
                        <tr key={`acc-${insIndex}-${accIndex}`}>
                          <td className="ps-5 align-middle border-end-0">
                            {acc.official_name} ({acc.mask})
                          </td>
                          <td className="text-center border-start-0">
                            <ButtonGroup size="sm">
                              <ToggleButton
                                id={`toggle-daily-${insIndex}-${accIndex}`}
                                type="checkbox"
                                variant="outline-dark"
                                checked={daily![insIndex][accIndex]}
                                value="d"
                                onChange={async (e) => {
                                  const newDaily = JSON.parse(JSON.stringify(daily));
                                  newDaily![insIndex][accIndex] = e.currentTarget.checked;

                                  await updateSubscription(
                                    props.data[insIndex].access_token_uuid,
                                    props.data[insIndex].accounts[accIndex].uuid,
                                    e.currentTarget.checked,
                                    weekly![insIndex][accIndex],
                                    monthly![insIndex][accIndex]
                                  );

                                  setDaily(newDaily);
                                }}
                              >
                                Daily
                              </ToggleButton>
                              <ToggleButton
                                id={`toggle-weekly-${insIndex}-${accIndex}`}
                                type="checkbox"
                                variant="outline-dark"
                                checked={weekly![insIndex][accIndex]}
                                value="w"
                                onChange={async (e) => {
                                  const newWeekly = JSON.parse(JSON.stringify(weekly));
                                  newWeekly![insIndex][accIndex] = e.currentTarget.checked;

                                  await updateSubscription(
                                    props.data[insIndex].access_token_uuid,
                                    props.data[insIndex].accounts[accIndex].uuid,
                                    daily![insIndex][accIndex],
                                    e.currentTarget.checked,
                                    monthly![insIndex][accIndex]
                                  );

                                  setWeekly(newWeekly);
                                }}
                              >
                                Weekly
                              </ToggleButton>
                              <ToggleButton
                                id={`toggle-monthly-${insIndex}-${accIndex}`}
                                type="checkbox"
                                variant="outline-dark"
                                checked={monthly![insIndex][accIndex]}
                                value="m"
                                onChange={async (e) => {
                                  const newMonthly = JSON.parse(JSON.stringify(monthly));
                                  newMonthly![insIndex][accIndex] = e.currentTarget.checked;

                                  await updateSubscription(
                                    props.data[insIndex].access_token_uuid,
                                    props.data[insIndex].accounts[accIndex].uuid,
                                    daily![insIndex][accIndex],
                                    weekly![insIndex][accIndex],
                                    e.currentTarget.checked
                                  );

                                  setMonthly(newMonthly);
                                }}
                              >
                                Monthly
                              </ToggleButton>
                            </ButtonGroup>

                            <Button
                              variant="outline-dark"
                              className="m-1"
                              onClick={async () => {
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

                                await updateSubscription(
                                  props.data[insIndex].access_token_uuid,
                                  props.data[insIndex].accounts[accIndex].uuid,
                                  newState,
                                  newState,
                                  newState
                                );
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
  const fetchAccounts = async () => {
    setIsLoading(true);

    const fetchResult = await fetch('/api/accounts');
    const data = await fetchResult.json();
    setAccountData(data);

    setIsLoading(false);
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [accountData, setAccountData] = useState<AccountData[]>([]);

  return (
    <main className={styles.main}>
      <Container className="mt-5">
        <Row>
          <Col></Col>
          <Col xs={8}>
            <Row className="mb-5">
              <Col className="p-0">
                <div className="fs-5">{props.emailAddress}</div>
              </Col>
              <Col className="text-end">
                <LinkAccounts setIsLoading={setIsLoading} fetchAccounts={fetchAccounts} />
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
              <AccountsPanel isLoading={isLoading} data={accountData} fetchAccounts={fetchAccounts} />
            </Row>
          </Col>
          <Col></Col>
        </Row>
      </Container>
    </main>
  );
};
