// this file must be executed from project root (email-summary/)

import { createTables } from '../lib/database/AppDAO';

(async () => {
  await createTables();
})();
