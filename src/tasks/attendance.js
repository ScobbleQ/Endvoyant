import { ContainerBuilder, MessageFlags } from 'discord.js';
import pLimit from 'p-limit';
import {
  createEvent,
  getAccount,
  getAllUsersWithAttendance,
  updateAccount,
} from '../db/queries.js';
import { attendance, generateCredByCode, grantOAuth } from '../skport/api/index.js';
import { privacy } from '../utils/privacy.js';

/**
 *
 * @param {import('discord.js').Client} client
 */
export async function checkAttendance(client) {
  // Random delay between 0 and 55 minutes
  const delay = Math.floor(Math.random() * 56) * 60 * 1000;
  await new Promise((resolve) => setTimeout(resolve, delay));

  const users = await getAllUsersWithAttendance();
  console.info(`[Cron:Attendance] Checking attendance for ${users.length} users`);
  const limit = pLimit(10);

  const task = users.map((u) =>
    limit(async () => {
      try {
        const skport = await getAccount(u.dcid);
        if (!skport) throw new Error("User's SKPort data not found");

        const oauth = await grantOAuth({ token: skport.accountToken, appCode: '6eb76d4e13aa36e6' });
        if (!oauth || oauth.status !== 0) throw new Error(oauth?.msg ?? 'OAuth failed');

        const cred = await generateCredByCode({ code: oauth.data.code });
        if (!cred || cred.status !== 0) {
          throw new Error(cred?.msg ?? 'Credential generation failed');
        }

        const attendanceRes = await attendance({
          cred: cred.data.cred,
          token: cred.data.token,
          uid: skport.roleId,
          serverId: skport.serverId,
        });

        if (!attendanceRes || attendanceRes.status !== 0) {
          throw new Error(attendanceRes?.msg ?? 'Attendance claim failed');
        }

        /** @type {{ type: string, reward: { name: string, count: number, icon: string }, bonus?: { name: string, count: number, icon: string }[] }} */
        const metadata = {
          type: 'attendance',
          reward: {
            name: attendanceRes.data[0].name,
            count: attendanceRes.data[0].count,
            icon: attendanceRes.data[0].icon,
          },
        };

        // If there are bonus rewards, add them to the metadata
        if (attendanceRes.data.length > 1) {
          metadata.bonus = attendanceRes.data.slice(1).map((r) => ({
            name: r.name,
            count: r.count,
            icon: r.icon,
          }));
        }

        await createEvent(u.dcid, {
          source: 'cron',
          action: 'attendance',
          metadata,
        });

        if (skport.enableNotif) {
          const container = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
              `# ▼// Sign-in Summary\n-# <t:${Math.floor(Date.now() / 1000)}:F>`
            )
          );

          container.addSeparatorComponents((separator) => separator);

          for (let i = 0; i < attendanceRes.data.length; i++) {
            const accountInfo = `${skport.nickname} (${privacy(skport.roleId, skport.isPrivate)})`;
            const reward = attendanceRes.data[i];

            // First reward is the main reward
            if (i === 0) {
              container.addSectionComponents((section) =>
                section
                  .addTextDisplayComponents((textDisplay) =>
                    textDisplay.setContent(
                      `### ${accountInfo}\n${reward.name}\nAmount: **${reward.count}**`
                    )
                  )
                  .setThumbnailAccessory((thumbnail) => thumbnail.setURL(reward.icon))
              );
            } else {
              container.addSectionComponents((section) =>
                section
                  .addTextDisplayComponents((textDisplay) =>
                    textDisplay.setContent(
                      `__Bonus Reward:__\n${reward.name}\nAmount: **${reward.count}**`
                    )
                  )
                  .setThumbnailAccessory((thumbnail) => thumbnail.setURL(reward.icon))
              );
            }
          }

          try {
            await client.users.send(u.dcid, {
              components: [container],
              flags: [MessageFlags.IsComponentsV2],
            });
          } catch (/** @type {any} */ error) {
            console.error(`[Cron:Attendance] Failed to DM user ${u.dcid}:`, error);
            if (error.code === 50007) {
              console.error(`[Cron:Attendance] User ${u.dcid} has DMs disabled`);
              await updateAccount(u.dcid, skport.id, { key: 'enableNotif', value: false });
            }
          }
        }
      } catch (error) {
        console.error(`[Cron:Attendance] Error checking attendance for user ${u.dcid}:`, error);
      }
    })
  );

  await Promise.allSettled(task).then(() => {
    console.info('[Cron:Attendance] Attendance checked');
  });
}
