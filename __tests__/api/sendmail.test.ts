import { createMocks } from 'node-mocks-http';
import sendMail from '@/pages/api/sendmail';

describe('/api/sendmail', () => {
  it('returns a 405 for GET requests', async () => {
    const { req, res } = createMocks({ method: 'GET' });

    await sendMail(req, res);

    expect(res._getStatusCode()).toBe(405);
  });
});
