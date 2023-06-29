import { GetServerSideProps } from 'next';

import ConfigPanel from '@/modules/ConfigPanel/';
import * as db from '@/lib/database/Adapter';

interface HomeProps {
  emailAddress: string;
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

const Config = (props: HomeProps) => <ConfigPanel emailAddress={props.emailAddress} />;

export default Config;
