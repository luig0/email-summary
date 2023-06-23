import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import Image from 'next/image';
import styles from '@/styles/Config.module.css';
import { useEffect, useState } from 'react';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Table from 'react-bootstrap/Table';
import Spinner from 'react-bootstrap/Spinner';

import * as db from '@/lib/database/Adapter';
import LinkAccounts from '@/components/LinkAccounts';
import type { AccountData } from './api/accounts';

interface ReauthorizeAccountsPanelProps {
  expiredConnections: AccountData[];
}

interface AccountsPanelProps {
  isLoading: boolean;
  data: AccountData[];
  fetchAccounts: () => void;
}

interface HomeProps {
  emailAddress: string;
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

const removeAccessToken = async (accessTokenUuid: string, fetchAccounts: () => void) => {
  const fetchResult = await fetch(`/api/access_token?uuid=${accessTokenUuid}`, { method: 'DELETE' });
  if (fetchResult.ok) await fetchAccounts();
};

const ReauthorizeAccountsPanel = (props: ReauthorizeAccountsPanelProps) => (
  <div style={{ background: '#ffc107' }} className="mb-5">
    <Table borderless className="mt-0">
      <thead>
        <tr className="border-top-0">
          <td colSpan={2} className="p-2 border-top-0 border-start-0 border-end-0">
            <div className="fs-2">Mailer no longer has access to the following accounts </div>
            <span className="fs-6">
              This usually happens because the institution wants you to confirm that the mailer should continue to have
              access to your transactions information.
            </span>
            <span className="fs-6 fst-italic">
              <br /><br />* This functionality is still being implemented. It is not yet possible to reauthorize.
            </span>
          </td>
        </tr>
      </thead>
      <tbody>
        {props.expiredConnections.map((connection, index) => (
          <tr key={`ec-${index}`}>
            <td className="ps-5 fs-4 border-end-0 text-start">{connection.name} </td>
            <td className="align-middle text-start border-start-0">
              <Button variant="primary" size="sm" disabled>
                Click here to reauthorize
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  </div>
);

const AccountsPanel = (props: AccountsPanelProps) => {
  const sendMail = async (period: string) => {
    setIsSendingMail(true);

    const date = new Date();
    date.setDate(date.getDate() - 1);
    const dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date
      .getDate()
      .toString()
      .padStart(2, '0')}`;

    await fetch('/api/sendmail', {
      method: 'POST',
      body: JSON.stringify({ period, dateString }),
      headers: { 'Content-Type': 'application/json' },
    });

    setIsSendingMail(false);
  };

  useEffect(() => {
    setAccountData(props.data);
    setExpiredConnections(props.data.filter((d) => d.is_expired === true));
  }, [props.data]);

  const { isLoading, fetchAccounts } = props;
  const [accountData, setAccountData] = useState<AccountData[]>(props.data);
  const [expiredConnections, setExpiredConnections] = useState<AccountData[]>([]);
  const [isSendingMail, setIsSendingMail] = useState<boolean>(false);

  return (
    <>
      {expiredConnections.length > 0 && <ReauthorizeAccountsPanel expiredConnections={expiredConnections} />}
      <Table borderless className="m-0">
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
                <>
                  {isSendingMail ? (
                    <Button
                      variant="primary"
                      className="m-1"
                      onClick={sendMail.bind(null, 'daily')}
                      size="sm"
                      disabled={isSendingMail}
                    >
                      <Spinner animation="border" size="sm" /> Test Daily Update
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      className="m-1"
                      onClick={sendMail.bind(null, 'daily')}
                      size="sm"
                      disabled={isSendingMail}
                    >
                      Test Daily Update
                    </Button>
                  )}
                  <Button variant="primary" className="m-1" onClick={sendMail.bind(null, 'weekly')} size="sm" disabled>
                    Test Weekly Update
                  </Button>
                </>
              )}
            </td>
          </tr>
        </tbody>
      </Table>

      {accountData.length > 0 && (
        <>
          {accountData.map((ins: AccountData, insIndex) => {
            const accounts = ins.accounts;
            return (
              <div key={`ins-${insIndex}`} className="p-0">
                <Table bordered>
                  <thead>
                    <tr>
                      <td className="ps-3 fs-4 border-end-0">{ins.name} </td>
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
                          <td className="ps-5 align-middle" colSpan={2}>
                            {acc.name} ({acc.mask})
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

const ConfigPanel = (props: HomeProps) => {
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
      <Container className="mt-5 mb-5">
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

export default ConfigPanel;
