import { ContainerBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { BotConfig } from '../../config.js';
import { Accounts, Users, Events } from '../db/queries.js';
import { attendance, generateCredByCode, grantOAuth } from '../skport/api/index.js';
import {
  MessageTone,
  credErrorContainer,
  noUserContainer,
  oauthErrorContainer,
  textContainer,
} from '../utils/containers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('attendance')
    .setDescription('Attendance to SKPort')
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  /** @param {import("discord.js").ChatInputCommandInteraction} interaction */
  async execute(interaction) {
    const user = await Users.getByDcid(interaction.user.id);
    if (!user) {
      await interaction.reply({
        components: [noUserContainer({ tone: MessageTone.Formal })],
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

    const [skport] = await Accounts.getByDcid(user.dcid);
    if (!skport) {
      await interaction.editReply({
        components: [textContainer('Please add a SKPort account with `/link account` first')],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    const oauth = await grantOAuth({ token: skport.accountToken, type: 0 });
    if (!oauth || oauth.status !== 0) {
      await interaction.editReply({
        components: [oauthErrorContainer()],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    // @ts-ignore: code is guaranteed since we are using type 0
    const cred = await generateCredByCode({ code: oauth.data.code });
    if (!cred || cred.status !== 0) {
      await interaction.editReply({
        components: [credErrorContainer()],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    const signin = await attendance({
      cred: cred.data.cred,
      token: cred.data.token,
      uid: skport.roleId,
      serverId: skport.serverId,
    });

    if (!signin || signin.status !== 0) {
      const code = JSON.parse(signin.msg).code || signin.status || -1;
      const msg = JSON.parse(signin.msg).message || signin.msg || 'Unknown error';

      await interaction.editReply({
        components: [textContainer(`### [${code}] ${msg}`)],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    // An event was created, update the metadata with the sign-in rewards
    if (eventId) {
      /** @type {{ reward: { name: string, count: number, icon: string }, bonus?: { name: string, count: number, icon: string }[] }} */
      const metadata = {
        reward: {
          name: signin.data[0].name,
          count: signin.data[0].count,
          icon: signin.data[0].icon,
        },
      };

      // If there are bonus rewards, add them to the metadata
      if (signin.data.length > 1) {
        metadata.bonus = signin.data.slice(1).map((r) => ({
          name: r.name,
          count: r.count,
          icon: r.icon,
        }));
      }

      await Events.update(interaction.user.id, eventId, { metadata });
    }

    const attendanceContainer = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(`# ▼// Sign-in Reward`)
    );

    for (const resource of signin.data) {
      attendanceContainer.addSectionComponents((section) =>
        section
          .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(`### ${resource.name}\nAmount: **${resource.count}**`)
          )
          .setThumbnailAccessory((thumbnail) => thumbnail.setURL(resource.icon))
      );
    }

    await interaction.editReply({
      components: [attendanceContainer],
      flags: [MessageFlags.IsComponentsV2],
    });
  },
};
