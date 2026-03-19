import { ContainerBuilder, DiscordAPIError, MessageFlags } from 'discord.js';
import pLimit from 'p-limit';
import { Users, Accounts, Events } from '#/db/queries.js';
import { attendance, generateCredByCode, grantOAuth } from '#/skport/api/index.js';
import { privacy } from '#/utils/privacy.js';
import logger from '#/logger';

/** @param {import('discord.js').Client} client */
export async function checkAttendance(client) {
  const delay = Math.floor(Math.random() * 56) * 60 * 1000;
  await new Promise((resolve) => setTimeout(resolve, delay));

  const users = await Accounts.getSigninByUser();
  logger.info(`[Cron:Attendance] Checking ${users.length} users`);

  // Process users in parallel
  const userLimit = pLimit(10);
  const userTask = users.map((u) =>
    userLimit(async () => {
      try {
        // Flag to keep track of if the user has content to send
        let userHasContent = false;

        // Create container for the user
        const container = new ContainerBuilder().addTextDisplayComponents((t) =>
          t.setContent(`## ▼// Sign-in Summary\n-# <t:${Math.floor(Date.now() / 1000)}:F>`)
        );

        // Process accounts in parallel
        const accountLimit = pLimit(5);
        const accountTasks = u.accounts.map((a) =>
          accountLimit(async () => {
            try {
              const oauth = await grantOAuth({
                token: a.accountToken,
                appCode: '6eb76d4e13aa36e6',
              });
              if (!oauth || oauth.status !== 0) throw new Error(oauth?.msg || 'OAuth failed');

              const cred = await generateCredByCode({ code: oauth.data.code });
              if (!cred || cred.status !== 0) throw new Error(cred?.msg || 'Credential failed');

              const signin = await attendance({
                cred: cred.data.cred,
                token: cred.data.token,
                uid: a.roleId,
                serverId: a.serverId,
              });

              if (!signin || signin.status !== 0)
                throw new Error(signin?.msg || 'Attendance failed');

              // Parse main and bonus rewards
              const mainReward = signin.data[0];
              const bonusRewards = signin.data
                .slice(1)
                .map((r) => ({ name: r.name, count: r.count, icon: r.icon }));

              // Create metadata for the event
              const metadata = {
                reward: { name: mainReward.name, count: mainReward.count, icon: mainReward.icon },
                ...(bonusRewards.length > 0 && {
                  bonus: bonusRewards,
                }),
              };

              await Events.create(u.dcid, { source: 'cron', action: 'attendance', metadata });

              // Early return, no need to add to container if notifications are disabled
              if (!u.enableNotif) return;
              userHasContent = true;

              const headingString = `### ${a.nickname} (${privacy(a.roleId, a.isPrivate)})`;
              const mainRewardString = `${mainReward.name}\nAmount: ${mainReward.count}`;
              const bonusString =
                bonusRewards.length > 0
                  ? `Additional Rewards:\n${bonusRewards.map((r) => `${r.name} x${r.count}`).join('\n')}`
                  : '';

              container.addSeparatorComponents((separator) => separator);
              container.addSectionComponents((section) =>
                section
                  .addTextDisplayComponents((textDisplay) =>
                    textDisplay.setContent(
                      `${headingString}\n${mainRewardString}\n\n${bonusString}`
                    )
                  )
                  .setThumbnailAccessory((thumbnail) => thumbnail.setURL(mainReward.icon))
              );

              return { account: a, rewards: signin.data };
            } catch (err) {
              logger.error(err, `[Cron:Attendance] Error for ${u.dcid}:${a.id}`);
            }
          })
        );

        await Promise.allSettled(accountTasks);

        if (!u.enableNotif || !userHasContent) return;

        try {
          await client.users.send(u.dcid, {
            components: [container],
            flags: [MessageFlags.IsComponentsV2],
          });
        } catch (error) {
          logger.error(error, `[Cron:Attendance] Failed to DM ${u.dcid}`);
          if (error instanceof DiscordAPIError && error.code === 50007) {
            await Users.update(u.dcid, { key: 'enableNotif', value: false });
          }
        }
      } catch (error) {
        logger.error(error, `[Cron:Attendance] Error for ${u.dcid}`);
      }
    })
  );

  await Promise.allSettled(userTask).then(() => {
    logger.info('[Cron:Attendance] Attendance checked');
  });
}
