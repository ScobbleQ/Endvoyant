import pLimit from 'p-limit';
import { getAccount, getAllUsers, getUser, updateAccount } from '#/db/queries.js';
import { accountToken, generateCredByCode, grantOAuth } from '#/skport/api/index.js';

/**
 *
 */
export async function refreshLoginToken() {
  // Random delay between 0 and 55 minutes
  const delay = Math.floor(Math.random() * 56) * 60 * 1000;
  await new Promise((resolve) => setTimeout(resolve, delay));

  console.info('[Cron:RefreshLoginToken] Refreshing login tokens for all users');
  const users = await getAllUsers();
  const limit = pLimit(10);

  const task = users.map((u) =>
    limit(async () => {
      try {
        const user = await getUser(u.dcid);
        if (!user) return;

        const skport = await getAccount(u.dcid);
        if (!skport) return;

        const oauth = await grantOAuth({ token: skport.accountToken, appCode: '6eb76d4e13aa36e6' });
        if (!oauth || oauth.status !== 0) return;

        const cred = await generateCredByCode({ code: oauth.data.code });
        if (!cred || cred.status !== 0) return;

        const token = await accountToken(skport.accountToken, cred.data.token, skport.hgId);
        if (token.status !== 0) return;

        await updateAccount(u.dcid, skport.id, { key: 'accountToken', value: token.data });
      } catch (error) {
        console.error(
          `[Cron:RefreshLoginToken] Error refreshing login token for user ${u.dcid}:`,
          error
        );
      }
    })
  );

  await Promise.allSettled(task).then(() => {
    console.info('[Cron:RefreshLoginToken] Login tokens refreshed');
  });
}
