import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import styles from '@/styles/Home.module.css';
import { useEffect, useState } from 'react';

import 'bootstrap/dist/css/bootstrap.min.css';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import * as db from '@/lib/database/Adapter';
import * as messages from '@/lib/Messages';

interface AppProps {
  loggedIn: boolean;
  username?: string;
}

interface RegistrationFormProps {
  setShowRegistrationForm: (arg: boolean) => void;
}

export const getServerSideProps: GetServerSideProps<AppProps> = async (context) => {
  const { req, res } = context;
  const props: AppProps = { loggedIn: false };

  const sessionToken = req.cookies['session-token'];

  if (sessionToken) {
    try {
      const { username } = await db.getSessionAndUser(sessionToken);
      props.loggedIn = true;
      props.username = username;
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

const LoginForm = () => {
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const username = (document.getElementById('formUsername') as HTMLInputElement)?.value;
    const password = (document.getElementById('formBasicPassword') as HTMLInputElement)?.value;

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    setLoginStatus(`${res.status} ${res.statusText}`);

    if (res.status === 200 && res.statusText === messages.OK) location.reload();
  };

  const [loginStatus, setLoginStatus] = useState('');

  return (
    <>
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-2" controlId="formUsername">
          <Form.Control type="text" placeholder="Username" />
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
    const username = (document.getElementById('formUsername') as HTMLInputElement)?.value;
    const password = (document.getElementById('formBasicPassword') as HTMLInputElement)?.value;
    const inviteCode = (document.getElementById('invite-code') as HTMLInputElement)?.value;

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, inviteCode }),
    });

    if (res.status === 409) {
      setLoginStatus('That username is already taken!');
    } else {
      setLoginStatus(`${res.status} ${res.statusText}`);
    }

    if (res.status === 201 && res.statusText === messages.CREATED) location.reload();
  };

  const { setShowRegistrationForm } = props;
  const [loginStatus, setLoginStatus] = useState('');

  return (
    <div className="mt-5">
      <Row>
        <Col></Col>
        <Col>
          <h2>Registration</h2>
          <div>
            Have an account?{' '}
            <a href="#" onClick={setShowRegistrationForm.bind(null, false)}>
              Sign in
            </a>
          </div>
          <Form onSubmit={handleSubmit} className="mt-3">
            <Form.Group className="mb-2" controlId="formUsername">
              <Form.Control type="text" placeholder="Username" />
            </Form.Group>
            <Form.Group className="mb-2" controlId="formBasicPassword">
              <Form.Control type="password" placeholder="Password" />
            </Form.Group>
            <Form.Group className="mb-2" controlId="formInviteCode">
              <Form.Control type="text" placeholder="Invitation Code" />
            </Form.Group>
            <div className="d-grid gap-2">
              <Button variant="primary" type="submit">
                Submit
              </Button>
            </div>
          </Form>
          <br />
          <div>{loginStatus.length > 0 && <span>{loginStatus}</span>}</div>
        </Col>
        <Col></Col>
      </Row>
      <Col></Col>
    </div>
  );
};

const App = (props: AppProps) => {
  const router = useRouter();
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);

  useEffect(() => {
    if (props.loggedIn) router.push('/home');
  }, []);

  if (!showRegistrationForm)
    return (
      <Container className="mt-5">
        <Row>
          <Col></Col>
          <Col>
            <h1>Welcome to my super secret website.</h1>
            <div>
              Have an invitation code?{' '}
              <a href="#" onClick={setShowRegistrationForm.bind(null, true)}>
                Sign up
              </a>
            </div>
          </Col>
          <Col></Col>
        </Row>
        <Row className="mt-3">
          <Col></Col>
          <Col>
            <LoginForm />
          </Col>
          <Col></Col>
        </Row>
      </Container>
    );
  else
    return (
      <Container>
        <RegistrationForm setShowRegistrationForm={setShowRegistrationForm} />
      </Container>
    );
};

export default (props: AppProps) => {
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
