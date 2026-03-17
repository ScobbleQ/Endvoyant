import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { Accounts, Users, Events, EfAttemptedCodes } from '../db/queries.js';
import { redeem, tokenByChannelToken, grantOAuth } from '../skport/api/index.js';
import {
  MessageTone,
  noUserContainer,
  oauthErrorContainer,
  textContainer,
} from '../utils/containers.js';
import { BotConfig } from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('redeem')
    .setDescription('Redeem codes')
    .addStringOption((option) =>
      option.setName('code').setDescription('The codes to redeem').setRequired(false)
    )
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  /** @param {import("discord.js").ChatInputCommandInteraction} interaction */
  async execute(interaction) {
    let code = interaction.options.getString('code') || 'TESTCODE1';

    const user = await Users.getByDcid(interaction.user.id);
    if (!user) {
      await interaction.reply({
        components: [noUserContainer({ tone: MessageTone.Formal })],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
      return;
    }

    await interaction.deferReply();

    if (BotConfig.environment === 'production') {
      await Events.create(interaction.user.id, {
        source: 'slash',
        action: 'redeem',
      });
    }

    const [skport] = await Accounts.getByDcid(user.dcid);
    if (!skport) {
      await interaction.editReply({
        components: [textContainer('Please add a SKPort account with `/link account` first')],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    const isCodeAttempted = await EfAttemptedCodes.isCodeAttempted(skport.id, code);
    if (isCodeAttempted) {
      await interaction.editReply({
        components: [textContainer('This code has already been attempted')],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    const oauth = await grantOAuth({ token: skport.accountToken, appCode: 'd9f6dbb6bbd6bb33' });
    if (!oauth || oauth.status !== 0) {
      await interaction.editReply({
        components: [oauthErrorContainer()],
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
        components: [textContainer(channelToken?.msg || 'Failed to get token by channel token')],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    const res = await redeem(code, {
      channelId: skport.channelId,
      serverId: skport.serverId,
      token: channelToken.data.token,
    });

    if (!res || res.status !== 0) {
      const code = res.status || -1;
      const msg = res.msg || 'Unknown error';

      await interaction.editReply({
        components: [textContainer(`### [${code}] ${msg}`)],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    await EfAttemptedCodes.create(skport.id, code);

    await interaction.editReply({
      components: [textContainer('Code redeemed successfully!')],
      flags: [MessageFlags.IsComponentsV2],
    });
  },
};
