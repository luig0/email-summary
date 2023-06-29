import { useRouter } from 'next/router';
import styles from './ConfigPanel.module.css';
import { useEffect, useState } from 'react';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';

import type { AccountData } from '@/pages/api/accounts';
import AccountsPane from '@/modules/ConfigPanel/AccountsPane';
import LinkAccounts from '@/common/components/LinkAccounts';

interface ConfigPanelProps {
  emailAddress: string;
}

const ConfigPanel = (props: ConfigPanelProps) => {
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
              <AccountsPane
                setIsLoading={setIsLoading}
                isLoading={isLoading}
                data={accountData}
                fetchAccounts={fetchAccounts}
              />
            </Row>
          </Col>
          <Col></Col>
        </Row>
      </Container>
    </main>
  );
};

export default ConfigPanel;
