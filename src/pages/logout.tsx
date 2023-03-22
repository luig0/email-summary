import { GetServerSideProps } from 'next';

import * as db from '@/lib/database/Adapter';

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const sessionToken = req.cookies['session-token'];

  if (!sessionToken)
    return {
      redirect: {
        permanent: false,
        destination: '/',
      },
      props: {},
    };

  res.setHeader(
    'set-cookie',
    `session-token=deleted; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; HttpOnly; SameSite=Strict`
  );

  try {
    const { username } = await db.getSessionAndUser(sessionToken);
    await db.deleteSession(sessionToken);
    return { props: { username } };
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

export default () => <>You have been logged out.</>;
