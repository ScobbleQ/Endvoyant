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
    .setDescription('Settings command')
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
  const container = new ContainerBuilder();
  container.addTextDisplayComponents((textDisplay) => textDisplay.setContent('## Settings'));
  container.addSectionComponents((section) =>
    section
      .addTextDisplayComponents((textDisplay) => textDisplay.setContent('### User Preferences'))
      .setButtonAccessory((button) =>
        button
          .setCustomId(createComponentId('settings', 'user'))
          .setLabel('Edit Preferences')
          .setStyle(ButtonStyle.Primary)
      )
  );
  container.addTextDisplayComponents((textDisplay) => textDisplay.setContent('### Your Accounts'));

  const accounts = await Accounts.getByDcid(dcid);
  if (accounts.length > 0) {
    for (const account of accounts) {
      container.addSeparatorComponents((separator) => separator);
      container.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `### ${account.nickname}\nUID: ${account.roleId}\nAdded on ${new Date(account.addedOn).toLocaleDateString()}`
        )
      );
      container.addActionRowComponents((row) =>
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(createComponentId('settings', 'accountPrimary', String(account.shortId)))
            .setLabel('Make Primary')
            .setStyle(ButtonStyle.Success)
            .setDisabled(account.isPrimary),
          new ButtonBuilder()
            .setCustomId(createComponentId('settings', 'account', String(account.shortId)))
            .setLabel('Account Settings')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(createComponentId('settings', 'accountDelete', String(account.shortId)))
            .setLabel('Delete Account')
            .setStyle(ButtonStyle.Danger)
        )
      );
    }
  }
  return container;
}

/** @param {import("discord.js").ButtonInteraction} interaction */
async function handleUserButton(interaction) {
  const user = await Users.getByDcid(interaction.user.id);
  if (!user) {
    await interaction.reply({
      components: [errorContainer('User not found.')],
      flags: [MessageFlags.Ephemeral],
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(createComponentId('settings', 'user'))
    .setTitle('User Preferences');

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
    .setDescription('Note: This will only apply to some features.')
    .setStringSelectMenuComponent(languageSelect);

  const notifSelect = new StringSelectMenuBuilder()
    .setCustomId('notif')
    .setPlaceholder('Allow or block')
    .addOptions(
      {
        label: 'Allow',
        value: 'allow',
        default: user.enableNotif ? true : false,
      },
      {
        label: 'Block',
        value: 'block',
        default: user.enableNotif ? false : true,
      }
    );

  const notifLabel = new LabelBuilder()
    .setLabel('Notifications')
    .setDescription('Receive DM notifications from the bot.')
    .setStringSelectMenuComponent(notifSelect);

  const privacySelect = new StringSelectMenuBuilder()
    .setCustomId('privacy')
    .setPlaceholder('Public or private')
    .addOptions(
      {
        label: 'Public',
        value: 'public',
        default: user.isPrivate ? false : true,
      },

      {
        label: 'Private',
        value: 'private',
        default: user.isPrivate ? true : false,
      }
    );

  const privacyLabel = new LabelBuilder()
    .setLabel('Privacy')
    .setDescription('Hide your profile from other users.')
    .setStringSelectMenuComponent(privacySelect);

  modal.addLabelComponents(languageLabel, notifLabel, privacyLabel);
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
      flags: [MessageFlags.Ephemeral],
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(createComponentId('settings', 'account', String(shortId)))
    .setTitle(`Change ${account.nickname} Settings`);

  const enableSigninSelect = new StringSelectMenuBuilder()
    .setCustomId('enableSignin')
    .setPlaceholder('Enable or disable')
    .addOptions(
      {
        label: 'Enable',
        value: 'enable',
        default: account.enableSignin ? true : false,
      },
      {
        label: 'Disable',
        value: 'disable',
        default: account.enableSignin ? false : true,
      }
    );

  const enableSigninLabel = new LabelBuilder()
    .setLabel('Auto Sign-in')
    .setDescription('Enable or disable auto sign-in for this account.')
    .setStringSelectMenuComponent(enableSigninSelect);

  const enableRedeemSelect = new StringSelectMenuBuilder()
    .setCustomId('enableRedeem')
    .setPlaceholder('Enable or disable')
    .addOptions(
      {
        label: 'Enable',
        value: 'enable',
        default: account.enableRedeem ? true : false,
      },
      {
        label: 'Disable',
        value: 'disable',
        default: account.enableRedeem ? false : true,
      }
    );

  const enableRedeemLabel = new LabelBuilder()
    .setLabel('Auto Redeem')
    .setDescription('Enable or disable auto redeem for this account.')
    .setStringSelectMenuComponent(enableRedeemSelect);

  modal.addLabelComponents(enableSigninLabel, enableRedeemLabel);
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
  await interaction.reply({
    components: [textContainer(`${account.nickname} has been removed.`)],
    flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
  });
}

/** @param {import("discord.js").ModalSubmitInteraction} interaction */
async function handleUserModal(interaction) {
  await interaction.deferUpdate();
  const [language] = interaction.fields.getStringSelectValues('language');
  const [notif] = interaction.fields.getStringSelectValues('notif');
  const [privacy] = interaction.fields.getStringSelectValues('privacy');

  await interaction.followUp({
    components: [textContainer(`Values updated: ${language}, ${notif}, ${privacy}`)],
    flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
  });
}

/** @param {import("discord.js").ModalSubmitInteraction} interaction */
async function handleAccountModal(interaction) {
  await interaction.deferUpdate();
  const [enableSignin] = interaction.fields.getStringSelectValues('enableSignin');
  const [enableRedeem] = interaction.fields.getStringSelectValues('enableRedeem');

  await interaction.followUp({
    components: [textContainer(`Values updated: ${enableSignin}, ${enableRedeem}`)],
    flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
  });
}
