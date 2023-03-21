import { GetServerSideProps } from 'next';
import Head from 'next/head';
import styles from '@/styles/Home.module.css';
import { useState } from 'react';

import LinkAccounts from '../components/LinkAccounts';

import * as db from '../lib/database/Adapter';

interface AppProps {
  loggedIn: boolean;
  username?: string;
}

interface LoginFormProps {
  setShowLoginForm: (arg: boolean) => void;
}

interface RegistrationFormProps {
  setShowRegistrationForm: (arg: boolean) => void;
}

export const getServerSideProps: GetServerSideProps<AppProps> = async (context) => {
  const { req } = context;
  const props: AppProps = { loggedIn: false };

  const sessionToken = req.cookies['session-token'];

  let username;
  if (sessionToken) {
    const result = await db.getSessionAndUser(sessionToken);
    username = result.username;
  }

  if (username) {
    props.loggedIn = true;
    props.username = username;
  }

  return { props };
};

const LoginForm = (props: LoginFormProps) => {
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const username = (document.getElementById('username') as HTMLInputElement)?.value;
    const password = (document.getElementById('password') as HTMLInputElement)?.value;

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    setLoginStatus(`${res.status} ${res.statusText}`);

    if (res.status === 200 && res.statusText === 'OK') location.reload();
  };

  const { setShowLoginForm } = props;
  const [loginStatus, setLoginStatus] = useState('');

  return (
    <div style={{ textAlign: 'center', height: '400px' }}>
      <form onSubmit={handleSubmit}>
        <fieldset className={styles.fieldset}>
          <label>
            Username: <input type="text" name="username" id="username" />
          </label>
          <br />
          <label>
            Password: <input type="password" name="password" id="password" />
          </label>
          <br />
        </fieldset>
        <input type="submit" value="Submit" />
        <input type="button" value="Cancel" onClick={() => setShowLoginForm(false)} />
      </form>
      <br />
      {loginStatus.length > 0 && <span>{loginStatus}</span>}
    </div>
  );
};

const RegistrationForm = (props: RegistrationFormProps) => {
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const username = (document.getElementById('username') as HTMLInputElement)?.value;
    const password = (document.getElementById('password') as HTMLInputElement)?.value;
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

    if (res.status === 200 && res.statusText === 'OK') location.reload();
  };

  const { setShowRegistrationForm } = props;
  const [loginStatus, setLoginStatus] = useState('');

  return (
    <div style={{ textAlign: 'center', height: '400px' }}>
      <form onSubmit={handleSubmit}>
        <fieldset className={styles.fieldset}>
          <label>
            Username: <input type="text" name="username" id="username" />
          </label>
          <br />
          <label>
            Password: <input type="password" name="password" id="password" />
          </label>
          <br />
          <label>
            Invitation Code: <input type="text" name="invite-code" id="invite-code" />
          </label>
          <br />
        </fieldset>
        <input type="submit" value="Submit" />
        <input type="button" value="Cancel" onClick={() => setShowRegistrationForm(false)} />
      </form>
      <br />
      {loginStatus.length > 0 && <span>{loginStatus}</span>}
    </div>
  );
};

const App = (props: AppProps) => {
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);

  if (props.loggedIn) {
    return (
      <>
        <div>Welcome {props.username}!</div>
        <br />
        <LinkAccounts />
      </>
    );
  } else {
    return (
      <div>
        <div style={{ margin: '20px', textAlign: 'center' }}>
          <button
            onClick={() => {
              setShowRegistrationForm(false);
              setShowLoginForm(true);
            }}
          >
            Login
          </button>
          <button
            onClick={() => {
              setShowLoginForm(false);
              setShowRegistrationForm(true);
            }}
          >
            Register
          </button>
        </div>
        <div>
          {showLoginForm && <LoginForm setShowLoginForm={setShowLoginForm} />}
          {showRegistrationForm && <RegistrationForm setShowRegistrationForm={setShowRegistrationForm} />}
        </div>
      </div>
    );
  }
};

export default function Home(props: AppProps) {
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
}
