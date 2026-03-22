import {
  ContainerBuilder,
  MessageFlags,
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  LabelBuilder,
  ModalBuilder,
} from 'discord.js';
import { errorContainer, textContainer } from '#/components/index.js';
import { lang } from '#/constants/index.js';
import { Accounts, Events, Users } from '#/db/index.js';
import { createComponentId, parseComponentId } from '#/utils/componentId.js';
import { BotConfig } from '#/config';

const addButtonInteractions = {
  user: { ownerOnly: true, execute: handleUserButton },
  account: { ownerOnly: true, execute: handleAccountButton },
  accountPrimary: { ownerOnly: true, execute: handleAccountPrimaryButton },
  accountDelete: { ownerOnly: true, execute: handleAccountDeleteButton },
};

const addModalInteractions = {
  user: handleUserModal,
  account: handleAccountModal,
};

export default {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Manage your Endvoyant profile and accounts')
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  /** @param {import("discord.js").ChatInputCommandInteraction} interaction */
  async execute(interaction) {
    const user = await Users.getByDcid(interaction.user.id);
    if (!user) {
      await interaction.reply({
        components: [errorContainer('Please add an account with `/add account` to continue.')],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
      return;
    }

    if (BotConfig.environment === 'production') {
      await Events.create(user.dcid, {
        source: 'slash',
        action: 'settings',
        metadata: {
          ...(interaction.inGuild() && {
            guildId: interaction.guildId,
          }),
        },
      });
    }

    const container = await buildSettingsContainer(interaction.user.id);
    await interaction.reply({
      components: [container],
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    });
  },
  interactions: {
    button: addButtonInteractions,
    modal: addModalInteractions,
  },
};

/** @param {string} dcid */
async function buildSettingsContainer(dcid) {
  const container = new ContainerBuilder()
    .addSectionComponents((section) =>
      section
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            ['## ▼// Your Settings', 'Manage your profile and linked SKPort accounts.'].join('\n')
          )
        )
        .setButtonAccessory((button) =>
          button
            .setCustomId(createComponentId('settings', 'user'))
            .setLabel('Edit Profile')
            .setStyle(ButtonStyle.Primary)
        )
    )
    .addTextDisplayComponents((textDisplay) => textDisplay.setContent('### Linked Accounts'));

  const accounts = await Accounts.getByDcid(dcid);
  if (accounts.length > 0) {
    for (const account of accounts) {
      const primaryBadge = account.isPrimary ? ' - *primary*' : '';
      const linkedDate = Math.floor(new Date(account.addedOn).getTime() / 1000);

      container.addSeparatorComponents((separator) => separator);
      container.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          [
            `**${account.nickname}**${primaryBadge}`,
            `-# UID \`${account.roleId}\``,
            `-# Linked <t:${linkedDate}:F>`,
          ].join('\n')
        )
      );
      container.addActionRowComponents((row) =>
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(createComponentId('settings', 'account', String(account.shortId)))
            .setLabel('Edit')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(createComponentId('settings', 'accountPrimary', String(account.shortId)))
            .setLabel(account.isPrimary ? 'Primary' : 'Set Primary')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(account.isPrimary),
          new ButtonBuilder()
            .setCustomId(createComponentId('settings', 'accountDelete', String(account.shortId)))
            .setLabel('Remove')
            .setStyle(ButtonStyle.Danger)
        )
      );
    }
  } else {
    container.addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        ['No accounts linked yet.', 'Use `/add account` to link your first SKPort account.'].join(
          '\n'
        )
      )
    );
  }
  return container;
}

/** @param {import("discord.js").ButtonInteraction} interaction */
async function handleUserButton(interaction) {
  const user = await Users.getByDcid(interaction.user.id);
  if (!user) {
    await interaction.reply({
      components: [errorContainer('User not found.')],
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(createComponentId('settings', 'user'))
    .setTitle('Edit Profile Settings');

  const privacySelect = new StringSelectMenuBuilder()
    .setCustomId('privacy')
    .setPlaceholder('Choose profile visibility')
    .addOptions(
      {
        label: 'Visible',
        value: 'public',
        default: user.isPrivate ? false : true,
      },

      {
        label: 'Hidden',
        value: 'private',
        default: user.isPrivate ? true : false,
      }
    );

  const privacyLabel = new LabelBuilder()
    .setLabel('Profile Visibility')
    .setDescription('Choose whether other users can view your profile.')
    .setStringSelectMenuComponent(privacySelect);

  const languageSelect = new StringSelectMenuBuilder()
    .setCustomId('language')
    .setPlaceholder('Select your language')
    .addOptions(
      Object.entries(lang).map(([value, label]) => ({
        label,
        value,
        default: user.lang === value,
      }))
    );

  const languageLabel = new LabelBuilder()
    .setLabel('Language')
    .setDescription('Used for supported bot responses and UI text.')
    .setStringSelectMenuComponent(languageSelect);

  const notifSelect = new StringSelectMenuBuilder()
    .setCustomId('notif')
    .setPlaceholder('Choose DM notifications')
    .addOptions(
      {
        label: 'Enabled',
        value: 'allow',
        default: user.enableNotif ? true : false,
      },
      {
        label: 'Disabled',
        value: 'block',
        default: user.enableNotif ? false : true,
      }
    );

  const notifLabel = new LabelBuilder()
    .setLabel('Notifications')
    .setDescription('Allow Endvoyant to send you direct message notifications.')
    .setStringSelectMenuComponent(notifSelect);

  modal.addLabelComponents(privacyLabel, languageLabel, notifLabel);
  await interaction.showModal(modal);
}

/** @param {import("discord.js").ButtonInteraction} interaction */
async function handleAccountButton(interaction) {
  const { args } = parseComponentId(interaction.customId) ?? {};
  const shortId = args?.length ? Number(args[0]) : NaN;
  const account = await Accounts.getByDcidAndShortId(interaction.user.id, shortId);

  if (!account) {
    await interaction.reply({
      components: [errorContainer('Account not found.')],
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(createComponentId('settings', 'account', String(shortId)))
    .setTitle(`Edit ${account.nickname}`);

  const privacySelect = new StringSelectMenuBuilder()
    .setCustomId('privacy')
    .setPlaceholder('Choose account visibility')
    .addOptions(
      {
        label: 'Visible',
        value: 'public',
        default: account.isPrivate ? false : true,
      },
      {
        label: 'Hidden',
        value: 'private',
        default: account.isPrivate ? true : false,
      }
    );

  const privacyLabel = new LabelBuilder()
    .setLabel('Account Visibility')
    .setDescription('Choose whether other users can view this account.')
    .setStringSelectMenuComponent(privacySelect);

  const enableSigninSelect = new StringSelectMenuBuilder()
    .setCustomId('enableSignin')
    .setPlaceholder('Choose auto sign-in status')
    .addOptions(
      {
        label: 'Enabled',
        value: 'enable',
        default: account.enableSignin ? true : false,
      },
      {
        label: 'Disabled',
        value: 'disable',
        default: account.enableSignin ? false : true,
      }
    );

  const enableSigninLabel = new LabelBuilder()
    .setLabel('Auto Check-in')
    .setDescription('Automatically check-in daily for this account.')
    .setStringSelectMenuComponent(enableSigninSelect);

  const enableRedeemSelect = new StringSelectMenuBuilder()
    .setCustomId('enableRedeem')
    .setPlaceholder('Choose auto redeem status')
    .addOptions(
      {
        label: 'Enabled',
        value: 'enable',
        default: account.enableRedeem ? true : false,
      },
      {
        label: 'Disabled',
        value: 'disable',
        default: account.enableRedeem ? false : true,
      }
    );

  const enableRedeemLabel = new LabelBuilder()
    .setLabel('Auto Code Redemption')
    .setDescription('Automatically redeem available codes for this account.')
    .setStringSelectMenuComponent(enableRedeemSelect);

  modal.addLabelComponents(privacyLabel, enableSigninLabel, enableRedeemLabel);
  await interaction.showModal(modal);
}

/** @param {import("discord.js").ButtonInteraction} interaction */
async function handleAccountPrimaryButton(interaction) {
  const shortId = Number(parseComponentId(interaction.customId)?.args?.[0]);
  const account = await Accounts.getByDcidAndShortId(interaction.user.id, shortId);
  if (!account) {
    await interaction.reply({
      components: [errorContainer('Account not found.')],
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    });
    return;
  }
  await Accounts.setPrimary(interaction.user.id, shortId);
  const container = await buildSettingsContainer(interaction.user.id);
  await interaction.update({ components: [container] });
}

/** @param {import("discord.js").ButtonInteraction} interaction */
async function handleAccountDeleteButton(interaction) {
  const shortId = Number(parseComponentId(interaction.customId)?.args?.[0]);
  const account = await Accounts.getByDcidAndShortId(interaction.user.id, shortId);
  if (!account) {
    await interaction.reply({
      components: [errorContainer('Account not found.')],
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    });
    return;
  }
  await Accounts.delete(interaction.user.id, shortId);
  const container = await buildSettingsContainer(interaction.user.id);
  await interaction.update({ components: [container] });
}

/** @param {import("discord.js").ModalSubmitInteraction} interaction */
async function handleUserModal(interaction) {
  await interaction.deferUpdate();

  const user = await Users.getByDcid(interaction.user.id);
  if (!user) {
    await interaction.followUp({
      components: [errorContainer('User not found.')],
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    });
    return;
  }

  const [language] = interaction.fields.getStringSelectValues('language');
  const [notif] = interaction.fields.getStringSelectValues('notif');
  const [privacy] = interaction.fields.getStringSelectValues('privacy');

  const isPrivate = privacy === 'private';
  const enableNotif = notif === 'allow';
  const langValue = Object.hasOwn(lang, language ?? '') ? language : user.lang;

  await Users.update(user.dcid, { key: 'lang', value: langValue });
  await Users.update(user.dcid, { key: 'enableNotif', value: enableNotif });
  await Users.update(user.dcid, { key: 'isPrivate', value: isPrivate });

  await interaction.followUp({
    components: [textContainer('Your profile settings have been updated.')],
    flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
  });
}

/** @param {import("discord.js").ModalSubmitInteraction} interaction */
async function handleAccountModal(interaction) {
  await interaction.deferUpdate();

  const { args } = parseComponentId(interaction.customId) ?? {};
  const shortId = args?.length ? Number(args[0]) : NaN;
  const account = await Accounts.getByDcidAndShortId(interaction.user.id, shortId);

  if (!account) {
    await interaction.followUp({
      components: [errorContainer('Account not found.')],
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    });
    return;
  }

  const [privacy] = interaction.fields.getStringSelectValues('privacy');
  const [enableSignin] = interaction.fields.getStringSelectValues('enableSignin');
  const [enableRedeem] = interaction.fields.getStringSelectValues('enableRedeem');

  const isPrivate = privacy === 'private';
  const signinEnabled = enableSignin === 'enable';
  const redeemEnabled = enableRedeem === 'enable';

  await Accounts.update(interaction.user.id, account.id, {
    key: 'isPrivate',
    value: isPrivate,
  });
  await Accounts.update(interaction.user.id, account.id, {
    key: 'enableSignin',
    value: signinEnabled,
  });
  await Accounts.update(interaction.user.id, account.id, {
    key: 'enableRedeem',
    value: redeemEnabled,
  });

  await interaction.followUp({
    components: [textContainer(`Updated settings for ${account.nickname}.`)],
    flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
  });
}
