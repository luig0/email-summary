import { useCallback, useEffect, useState } from 'react';
import { usePlaidLink, PlaidLinkOnSuccessMetadata } from 'react-plaid-link';

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
    console.log('onSuccess, response data:', await response.json());
  }, []);

  const config: Parameters<typeof usePlaidLink>[0] = {
    token: props.linkToken,
    // receivedRedirectUri: window.location.href,
    onSuccess,
  };

  const { open, ready } = usePlaidLink(config);

  return (
    <button onClick={() => open()} disabled={!ready}>
      Link account
    </button>
  );
};

export default function LinkAccounts() {
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

  return linkToken !== null ? <Link linkToken={linkToken} /> : <>Fetching link token. Please wait.</>;
}
