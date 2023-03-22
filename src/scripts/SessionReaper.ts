// this file must be executed from project root (joint-summary/)

import * as dao from '@/lib/database/AppDAO';
import * as db from '@/lib/database/Adapter';

const CURRENT_TIME = Date.now();

(async () => {
  const allSessions = await dao.all(`SELECT * FROM sessions`);
  console.log(`found ${allSessions.length} sessions`);

  for (const session of allSessions) {
    if (CURRENT_TIME - new Date(session.expires_at).getTime() > 0) {
      await db.deleteSession(session.session_token);
      console.log('deleted:', session);
    }
  }
})();
