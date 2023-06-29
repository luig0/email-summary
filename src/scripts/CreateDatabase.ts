// this file must be executed from project root (email-summary/)

import { createTables } from '../common/utils/database/AppDAO';

(async () => {
  await createTables();
})();
