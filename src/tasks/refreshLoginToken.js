import pLimit from 'p-limit';
import { Accounts, Users } from '#/db/index.js';
import { accountToken, generateCredByCode, grantOAuth } from '#/skport/api/index.js';
import logger from '#/logger';

/**
 *
 */
export async function refreshLoginToken() {
  // Random delay between 0 and 55 minutes
  const delay = Math.floor(Math.random() * 56) * 60 * 1000;
  await new Promise((resolve) => setTimeout(resolve, delay));

  logger.info('[Cron:RefreshLoginToken] Refreshing login tokens for all users');
  const users = await Users.getAll();

  const userLimit = pLimit(10);
  const userTask = users.map((u) =>
    userLimit(async () => {
      try {
        const user = await Users.getByDcid(u.dcid);
        if (!user) return;

        const accounts = await Accounts.getByDcid(u.dcid);
        if (!accounts || accounts.length === 0) return;

        const accountLimit = pLimit(5);
        const accountTasks = accounts.map((a) =>
          accountLimit(async () => {
            try {
              const oauth = await grantOAuth({
                token: a.accountToken,
                appCode: '6eb76d4e13aa36e6',
              });
              if (!oauth || oauth.status !== 0) return;

              const cred = await generateCredByCode({ code: oauth.data.code });
              if (!cred || cred.status !== 0) return;

              const token = await accountToken(a.accountToken, cred.data.token, a.hgId);
              if (token.status !== 0) return;

              await Accounts.update(u.dcid, a.id, { key: 'accountToken', value: token.data });
            } catch (error) {
              logger.error(
                error,
                `[Cron:RefreshLoginToken] Error refreshing login token for account ${a.id}`
              );
            }
          })
        );

        await Promise.allSettled(accountTasks);
      } catch (error) {
        logger.error(
          error,
          `[Cron:RefreshLoginToken] Error refreshing login token for user ${u.dcid}`
        );
      }
    })
  );

  await Promise.allSettled(userTask).then(() => {
    logger.info('[Cron:RefreshLoginToken] Login tokens refreshed');
  });
}
