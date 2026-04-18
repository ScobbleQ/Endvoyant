import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { errorContainer, textContainer, warningContainer } from '#/components/index.js';
import { Accounts, Users, Events, EfAttemptedCodes } from '#/db/index.js';
import { redeem, tokenByChannelToken, grantOAuth } from '#/skport/api/index.js';
import { BotConfig } from '#/config';

export default {
  data: new SlashCommandBuilder()
    .setName('redeem')
    .setDescription('Redeem codes')
    .addStringOption((option) =>
      option.setName('code').setDescription('The code to redeem').setRequired(true)
    )
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  /** @param {import("discord.js").ChatInputCommandInteraction} interaction */
  async execute(interaction) {
    const code = interaction.options.getString('code')?.trim();
    if (!code) {
      await interaction.reply({
        components: [errorContainer('Please provide a redeem code.')],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
      return;
    }

    const user = await Users.getByDcid(interaction.user.id);
    if (!user) {
      await interaction.reply({
        components: [errorContainer('Please add an account with `/add account` to continue.')],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
      return;
    }

    await interaction.deferReply();

    if (BotConfig.environment === 'production') {
      await Events.create(user.dcid, {
        source: 'slash',
        action: 'redeem',
        metadata: {
          ...(interaction.inGuild() && {
            guildId: interaction.guildId,
          }),
        },
      });
    }

    const [skport] = await Accounts.getByDcid(user.dcid);
    if (!skport) {
      await interaction.editReply({
        components: [errorContainer('Please add an account with `/add account` to continue.')],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    const attemptedCode = await EfAttemptedCodes.getCodeByAid(skport.id, code);
    if (attemptedCode?.status === 0) {
      await interaction.editReply({
        components: [warningContainer('This code has already been successfully redeemed')],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    const oauth = await grantOAuth({ token: skport.accountToken, appCode: 'd9f6dbb6bbd6bb33' });
    if (!oauth || oauth.status !== 0) {
      await interaction.editReply({
        components: [errorContainer('Failed to grant OAuth token')],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    const channelToken = await tokenByChannelToken({
      channelId: skport.channelId,
      channelToken: oauth.data.code,
    });

    if (!channelToken || channelToken.status !== 0) {
      await interaction.editReply({
        components: [errorContainer(channelToken?.msg || 'Failed to get token by channel token')],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    const res = await redeem(code, {
      channelId: skport.channelId,
      serverId: skport.serverId,
      token: channelToken.data.token,
    });

    if (attemptedCode) {
      await EfAttemptedCodes.updateStatus(skport.id, code, res.status);
    } else {
      await EfAttemptedCodes.create(skport.id, code, res.status);
    }

    if (!res || res.status !== 0) {
      const code = res.status || -1;
      const msg = res.msg || 'Unknown error';

      await interaction.editReply({
        components: [errorContainer(`[${code}] ${msg}`)],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    await interaction.editReply({
      components: [textContainer('Code redeemed successfully!')],
      flags: [MessageFlags.IsComponentsV2],
    });
  },
};
