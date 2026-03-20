import { ContainerBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import pLimit from 'p-limit';
import { errorContainer } from '#/components/index.js';
import { Accounts, Users, Events } from '#/db/index.js';
import { attendance, generateCredByCode, grantOAuth } from '#/skport/api/index.js';
import { privacy } from '#/utils/index.js';
import logger from '#/utils/logger.js';
import { BotConfig } from '#/config';

export default {
  data: new SlashCommandBuilder()
    .setName('attendance')
    .setDescription('Attendance to SKPort')
    .addStringOption((option) =>
      option
        .setName('account')
        .setDescription('The account to sign in')
        .setAutocomplete(true)
        .setRequired(false)
    )
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  /** @param {import("discord.js").AutocompleteInteraction} interaction */
  async autocomplete(interaction) {
    const focusedOptions = interaction.options.getFocused(true);
    const accounts = await Accounts.getByDcid(interaction.user.id);
    if (!accounts || accounts.length === 0) {
      await interaction.respond([{ name: 'No accounts found', value: '-999' }]);
      return;
    }

    const filtered = accounts
      .filter((a) => a.nickname.toLowerCase().includes(focusedOptions.value.toLowerCase()))
      .slice(0, 25);

    await interaction.respond(
      filtered.map((a) => ({ name: `${a.nickname} (${a.roleId})`, value: a.id }))
    );
  },
  /** @param {import("discord.js").ChatInputCommandInteraction} interaction */
  async execute(interaction) {
    const accountQuery = interaction.options.getString('account');

    const user = await Users.getByDcid(interaction.user.id);
    if (!user) {
      await interaction.reply({
        components: [errorContainer('Please add an account with `/add account` to continue.')],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
      return;
    }

    await interaction.deferReply();

    /** @type {number | null} */
    let eventId = null;
    if (BotConfig.environment === 'production') {
      const event = await Events.create(interaction.user.id, {
        source: 'slash',
        action: 'attendance',
      });
      eventId = event[0]?.id ?? null;
    }

    const accountList = await Accounts.getByDcid(user.dcid);
    if (!accountList || accountList.length === 0) {
      await interaction.editReply({
        components: [errorContainer('Please add an account with `/add account` to continue.')],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    const accounts = accountQuery ? [accountList.find((a) => a.id === accountQuery)] : accountList;
    let hasContent = false;

    const c = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(`## ▼// Sign-in Reward\n-# <t:${Math.floor(Date.now() / 1000)}:F>`)
    );

    const limit = pLimit(5);
    const task = accounts.map((a) =>
      limit(async () => {
        try {
          if (!a) return;
          const headingString = `### ${a.nickname} (${privacy(a.roleId, a.isPrivate)})`;

          const oauth = await grantOAuth({ token: a.accountToken, appCode: '6eb76d4e13aa36e6' });
          if (!oauth || oauth.status !== 0) throw new Error(oauth?.msg || 'OAuth failed');

          const cred = await generateCredByCode({ code: oauth.data.code });
          if (!cred || cred.status !== 0) throw new Error(cred?.msg || 'Credential failed');

          const signin = await attendance({
            cred: cred.data.cred,
            token: cred.data.token,
            uid: a.roleId,
            serverId: a.serverId,
          });

          hasContent = true;

          if (signin.status !== 0) {
            c.addSeparatorComponents((separator) => separator);
            c.addTextDisplayComponents((textDisplay) =>
              textDisplay.setContent(`${headingString}\n${signin.msg || 'Unknown error'}`)
            );
            return;
          }

          const mainReward = signin.data[0];
          const bonusRewards = signin.data
            .slice(1)
            .map((r) => ({ name: r.name, count: r.count, icon: r.icon }));

          if (eventId) {
            await Events.update(user.dcid, eventId, {
              aid: a.id,
              metadata: {
                reward: {
                  name: mainReward.name,
                  count: mainReward.count,
                  icon: mainReward.icon,
                },
                ...(bonusRewards.length > 0 && { bonus: bonusRewards }),
              },
            });
          }

          const rewardString = `${mainReward.name}\nAmount: ${mainReward.count}`;
          const bonusString =
            bonusRewards.length > 0
              ? `Additional Rewards:\n${bonusRewards.map((r) => `${r.name} x${r.count}`).join('\n')}`
              : '';

          c.addSeparatorComponents((separator) => separator);
          c.addSectionComponents((section) =>
            section
              .addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(`${headingString}\n${rewardString}\n\n${bonusString}`)
              )
              .setThumbnailAccessory((thumbnail) => thumbnail.setURL(mainReward.icon))
          );
        } catch (error) {
          logger.error(error, `[Command:Attendance] Failed to sign in for ${a?.dcid}:${a?.id}`);
        }
      })
    );

    await Promise.allSettled(task);

    if (hasContent) {
      await interaction.editReply({
        components: [c],
        flags: [MessageFlags.IsComponentsV2],
      });
    }
  },
};
