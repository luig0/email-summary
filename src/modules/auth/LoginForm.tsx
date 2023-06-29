import { useState } from 'react';

import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';

import * as messages from '@/common/Messages';

interface LoginFormProps {
  setShowRegistrationForm: (arg: boolean) => void;
}

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

export default LoginForm;
