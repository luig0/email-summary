import { useCallback, useEffect, useState } from 'react';
import { usePlaidLink, PlaidLinkOnSuccessMetadata } from 'react-plaid-link';

import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';

// LINK COMPONENT
// Use Plaid Link and pass link token and onSuccess function
// in configuration to initialize Plaid Link
interface LinkProps {
  linkToken: string;
}
const Link: React.FC<LinkProps> = (props: LinkProps) => {
  const onSuccess = useCallback(async (public_token: string, metadata: PlaidLinkOnSuccessMetadata) => {
    // send public_token to server
    const response = await fetch('/api/set_access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ public_token }),
    });
    // Handle response ...
    console.log('onSuccess, response data:', response.statusText);
    location.reload();
  }, []);

  const config: Parameters<typeof usePlaidLink>[0] = {
    token: props.linkToken,
    // receivedRedirectUri: window.location.href,
    onSuccess,
  };

  const { open, ready } = usePlaidLink(config);

  return (
    <Button variant="primary" onClick={() => open()} disabled={!ready}>
      Link bank accounts
    </Button>
  );
};

export default () => {
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
    <Link linkToken={linkToken} />
  ) : (
    <>
      <Button variant="secondary" disabled>
        <Spinner animation="border" size="sm" /> Loading link component..
      </Button>
    </>
  );
};
