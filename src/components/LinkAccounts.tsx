import { useCallback, useEffect, useState } from 'react';
import { usePlaidLink, PlaidLinkOnSuccessMetadata } from 'react-plaid-link';

import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';

interface LinkAccountsProps {
  setIsLoading: (arg: boolean) => void;
  fetchAccounts: () => void;
}

// LINK COMPONENT
// Use Plaid Link and pass link token and onSuccess function
// in configuration to initialize Plaid Link
interface LinkProps {
  linkToken: string;
  setIsLoading: (arg: boolean) => void;
  fetchAccounts: () => void;
}
const Link: React.FC<LinkProps> = (props: LinkProps) => {
  const onSuccess = useCallback(async (public_token: string, metadata: PlaidLinkOnSuccessMetadata) => {
    // send public_token to server
    const response = await fetch('/api/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ public_token }),
    });
    // Handle response ...
    // console.log('Link onSuccess, response data:', response.statusText);
    setIsLoading(false);
    props.fetchAccounts();
  }, []);

  const onExit = () => {
    // https://plaid.com/docs/link/web/#onexit
    setIsLoading(false);
  };

  const { setIsLoading } = props;

  const config: Parameters<typeof usePlaidLink>[0] = {
    token: props.linkToken,
    // receivedRedirectUri: window.location.href,
    onSuccess,
    onExit,
  };

  const { open, ready } = usePlaidLink(config);

  return (
    <Button
      variant="outline-dark"
      onClick={() => {
        setIsLoading(true);
        open();
      }}
      disabled={!ready}
    >
      Link bank accounts
    </Button>
  );
};

export default (props: LinkAccountsProps) => {
  const generateToken = async () => {
    const response = await fetch('/api/create_link_token', {
      method: 'POST',
    });
    if (response.ok) {
      const data = await response.json();
      setLinkToken(data.link_token);
    } else {
      console.log(response);
    }
  };

  const [linkToken, setLinkToken] = useState(null);

  useEffect(() => {
    generateToken();
  }, []);

  return linkToken !== null ? (
    <Link linkToken={linkToken} setIsLoading={props.setIsLoading} fetchAccounts={props.fetchAccounts} />
  ) : (
    <>
      <Button variant="secondary" disabled>
        <Spinner animation="border" size="sm" /> Loading link component..
      </Button>
    </>
  );
};
