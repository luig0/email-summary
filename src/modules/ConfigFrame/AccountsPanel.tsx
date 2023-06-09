import { useEffect, useState } from 'react';
import styles from './ConfigFrame.module.css';

import Button from 'react-bootstrap/Button';
import Table from 'react-bootstrap/Table';
import Spinner from 'react-bootstrap/Spinner';

import type { AccountData } from '@/pages/api/accounts';
import LinkAccounts from './LinkAccounts';

interface ReauthorizeAccountsPanelProps {
  setIsLoading: (arg: boolean) => void;
  expiredConnections: AccountData[];
  fetchAccounts: () => void;
}

interface AccountsPanelProps {
  setIsLoading: (arg: boolean) => void;
  isLoading: boolean;
  data: AccountData[];
  fetchAccounts: () => void;
}

const removeAccessToken = async (accessTokenUuid: string, fetchAccounts: () => void) => {
  const fetchResult = await fetch(`/api/access_token?uuid=${accessTokenUuid}`, { method: 'DELETE' });
  if (fetchResult.ok) await fetchAccounts();
};

const ReauthorizeAccountsNotification = (props: ReauthorizeAccountsPanelProps) => (
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
          </td>
        </tr>
      </thead>
      <tbody>
        {props.expiredConnections.map((connection, index) => (
          <tr key={`ec-${index}`}>
            <td className="ps-5 fs-4 border-end-0 text-start">{connection.name} </td>
            <td className="align-middle text-start border-start-0">
              <LinkAccounts
                setIsLoading={props.setIsLoading}
                fetchAccounts={props.fetchAccounts}
                accessTokenUuid={connection.access_token_uuid}
              />
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

  const { setIsLoading, isLoading, fetchAccounts } = props;
  const [accountData, setAccountData] = useState<AccountData[]>(props.data);
  const [expiredConnections, setExpiredConnections] = useState<AccountData[]>([]);
  const [isSendingMail, setIsSendingMail] = useState<boolean>(false);

  return (
    <>
      {expiredConnections.length > 0 && (
        <ReauthorizeAccountsNotification
          setIsLoading={setIsLoading}
          expiredConnections={expiredConnections}
          fetchAccounts={fetchAccounts}
        />
      )}

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

export default AccountsPanel;
