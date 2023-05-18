import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import styles from '@/styles/Home.module.css';
import { useEffect, useState } from 'react';

import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import * as db from '@/lib/database/Adapter';
import * as messages from '@/lib/Messages';

interface AppProps {
  loggedIn: boolean;
  emailAddress?: string;
}

interface LoginFormProps {
  setShowRegistrationForm: (arg: boolean) => void;
}

interface RegistrationFormProps {
  setShowRegistrationForm: (arg: boolean) => void;
}

// https://stackoverflow.com/a/201378
const emailAddressRegex = new RegExp(
  /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/
);
const hasLowerCaseRegex = new RegExp(/[a-z]+/);
const hasUpperCaseRegex = new RegExp(/[A-Z]+/);
const hasNumberRegex = new RegExp(/[0-9]+/);
const hasSpecialCharacterRegex = new RegExp(/[!@#\$%\^&\*\(\)\-_\+=]+/);

// form validation
const hasEmailAddress = (emailAddress: string) => emailAddress.length > 0 && emailAddressRegex.test(emailAddress);
const hasPasswordLength = (password: string) => password.length >= 8 && password.length <= 22;
const hasPasswordComplexity = (password: string) =>
  hasLowerCaseRegex.test(password) &&
  hasUpperCaseRegex.test(password) &&
  hasNumberRegex.test(password) &&
  hasSpecialCharacterRegex.test(password);
const hasInvitationCode = (invitationCode: string) => invitationCode.length > 0;
const hasAllRegistrationChecks = (emailAddress: string, password: string, invitationCode: string) =>
  hasEmailAddress(emailAddress) &&
  hasPasswordLength(password) &&
  hasPasswordComplexity(password) &&
  hasInvitationCode(invitationCode);

export const getServerSideProps: GetServerSideProps<AppProps> = async (context) => {
  const { req, res } = context;
  const props: AppProps = { loggedIn: false };

  const sessionToken = req.cookies['session-token'];

  if (sessionToken) {
    try {
      const { email_address } = await db.getSessionAndUser(sessionToken);
      props.loggedIn = true;
      props.emailAddress = email_address;
    } catch (error: any) {
      if (error.message !== messages.SESSION_HAS_EXPIRED) console.log('index.tsx error:', error.message);
      else
        res.setHeader(
          'set-cookie',
          `session-token=deleted; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; HttpOnly; SameSite=Strict`
        ); // session token is invalid; clear it
    }
  }

  return { props };
};

const LoginForm = (props: LoginFormProps) => {
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const emailAddress = (document.getElementById('formEmailAddress') as HTMLInputElement)?.value;
    const password = (document.getElementById('formBasicPassword') as HTMLInputElement)?.value;

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailAddress, password }),
    });

    setLoginStatus(`${res.status} ${res.statusText}`);

    if (res.status === 200 && res.statusText === messages.OK) location.reload();
  };

  const { setShowRegistrationForm } = props;
  const [loginStatus, setLoginStatus] = useState('');

  return (
    <>
      <div>
        Have an invitation code?{' '}
        <a href="#" onClick={setShowRegistrationForm.bind(null, true)}>
          Sign up
        </a>
      </div>
      <Form onSubmit={handleSubmit} className="mt-3">
        <Form.Group className="mb-2" controlId="formEmailAddress">
          <Form.Control type="text" placeholder="Email Address" />
        </Form.Group>
        <Form.Group className="mb-2" controlId="formBasicPassword">
          <Form.Control type="password" placeholder="Password" />
        </Form.Group>
        <div className="d-grid gap-2">
          <Button variant="primary" type="submit">
            Sign in
          </Button>
        </div>
      </Form>
      <br />
      {loginStatus.length > 0 && <span>{loginStatus}</span>}
    </>
  );
};

const RegistrationForm = (props: RegistrationFormProps) => {
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const emailAddress = (document.getElementById('formEmailAddress') as HTMLInputElement)?.value;
    const password = (document.getElementById('formBasicPassword') as HTMLInputElement)?.value;
    const inviteCode = (document.getElementById('formInviteCode') as HTMLInputElement)?.value;

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailAddress, password, inviteCode }),
    });

    if (res.status === 409) {
      setLoginStatus('That email address is already registered!');
    } else {
      setLoginStatus(`${res.status} ${res.statusText}`);
    }

    if (res.status === 201 && res.statusText === messages.CREATED) location.reload();
  };

  const { setShowRegistrationForm } = props;
  const [loginStatus, setLoginStatus] = useState('');

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [invitationCode, setInvitationCode] = useState('');

  return (
    <div>
      <div>
        Have an account?{' '}
        <a href="#" onClick={setShowRegistrationForm.bind(null, false)}>
          Sign in
        </a>
      </div>
      <Form onSubmit={handleSubmit} className="mt-3">
        <Form.Group className="mb-2" controlId="formEmailAddress">
          <Form.Control
            type="text"
            placeholder="Email Address"
            onChange={(e) => {
              setEmailAddress(e.target.value);
            }}
          />
        </Form.Group>
        <Form.Group className="mb-2" controlId="formBasicPassword">
          <Form.Control
            type="password"
            placeholder="Password"
            onChange={(e) => {
              setPassword(e.target.value);
            }}
          />
        </Form.Group>
        <Form.Group className="mb-2" controlId="formInviteCode">
          <Form.Control
            type="text"
            placeholder="Invitation Code"
            onChange={(e) => {
              setInvitationCode(e.target.value);
            }}
          />
        </Form.Group>
        <div className="d-grid gap-2">
          <Button
            variant="primary"
            type="submit"
            disabled={!hasAllRegistrationChecks(emailAddress, password, invitationCode)}
          >
            Register
          </Button>
        </div>
      </Form>
      <br />
      <div>
        {emailAddress.length > 0 && !hasEmailAddress(emailAddress) && (
          <span style={{ color: 'red' }}>Email address is invalid!</span>
        )}
      </div>
      <div>
        {password.length > 0 && (
          <>
            <div style={hasPasswordLength(password) ? { color: 'green' } : { color: 'red' }}>
              Password length must be 8-22 characters.
            </div>
            <div style={hasLowerCaseRegex.test(password) ? { color: 'green' } : { color: 'red' }}>
              Password must contain at least one lower case letter.
            </div>
            <div style={hasUpperCaseRegex.test(password) ? { color: 'green' } : { color: 'red' }}>
              Password must contain at least one upper case letter.
            </div>
            <div style={hasNumberRegex.test(password) ? { color: 'green' } : { color: 'red' }}>
              Password must contain at least one number.
            </div>
            <div style={hasSpecialCharacterRegex.test(password) ? { color: 'green' } : { color: 'red' }}>
              Password must contain at least one special character: !@#$%^&*()-_+=
            </div>
          </>
        )}
      </div>
      <div>{loginStatus.length > 0 && <span>{loginStatus}</span>}</div>
    </div>
  );
};

const App = (props: AppProps) => {
  const router = useRouter();
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);

  useEffect(() => {
    if (props.loggedIn) router.push('/config');
  }, [props.loggedIn, router]);

  return (
    <Container className="mt-5">
      <Row>
        <Col></Col>
        <Col xs={6}>
          <h1>Welcome to my super secret website.</h1>
          {!showRegistrationForm && <LoginForm setShowRegistrationForm={setShowRegistrationForm} />}
          {showRegistrationForm && <RegistrationForm setShowRegistrationForm={setShowRegistrationForm} />}
        </Col>
        <Col></Col>
      </Row>
    </Container>
  );
};

const Home = (props: AppProps) => {
  return (
    <>
      <Head>
        <title>CNA: joint-summary</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
        <App {...props} />
      </main>
    </>
  );
};

export default Home;
