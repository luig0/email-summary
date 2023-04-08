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

const sendMail = async () => {
  await fetch('/api/sendmail', { method: 'POST' });
};

const AccountsPanel = (props: AccountsPanelProps) => {
  useEffect(() => {
    setAccountData(props.data);
  }, [props.data]);

  const { isLoading, fetchAccounts } = props;
  const [accountData, setAccountData] = useState(props.data);

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
                <Button variant="primary" className="m-1" onClick={sendMail} size="sm">
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
                          <td className="ps-5 align-middle" colSpan={2}>
                            {acc.official_name} ({acc.mask})
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

export default ConfigPanel;
