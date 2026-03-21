import { ContainerBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { textContainer, errorContainer, warningContainer } from '#/components/index.js';
import { Accounts, Events, Users } from '#/db/index.js';
import {
  addAccountContainer,
  alreadyLinkedContainer,
  cookieModal,
  loginModal,
  onboardingContainer,
} from '#/features/add/ui.js';
import {
  generateCredByCode,
  getBinding,
  grantOAuth,
  tokenByEmailPassword,
} from '#/skport/api/index.js';
import { parseCookieToken, sleep } from '#/utils/index.js';
import { BotConfig } from '#/config';

/** @type {Record<string, { ownerOnly: boolean, execute: (interaction: import("discord.js").ButtonInteraction) => Promise<void> }>} */
const addButtonInteractions = {
  agree: { ownerOnly: true, execute: handleAgreeButton },
  login: { ownerOnly: true, execute: handleLoginButton },
  token: { ownerOnly: true, execute: handleTokenButton },
  info: { ownerOnly: true, execute: handleInfoButton },
};

/** @type {Record<string, (interaction: import("discord.js").ModalSubmitInteraction) => Promise<void>>} */
const addModalInteractions = {
  login: handleLoginModal,
  token: handleTokenModal,
};

export default {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('Add a SKPort account to your Discord account')
    .addSubcommand((subcommand) =>
      subcommand.setName('account').setDescription('Add a SKPort account to your Discord account')
    )
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  /** @param {import("discord.js").ChatInputCommandInteraction} interaction */
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand !== 'account') {
      await interaction.reply({
        components: [errorContainer('Invalid subcommand')],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
      return;
    }

    const user = await Users.getByDcid(interaction.user.id);
    if (!user) {
      await interaction.reply({
        components: [onboardingContainer()],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
      return;
    }

    if (BotConfig.environment === 'production') {
      await Events.create(user.dcid, {
        source: 'slash',
        action: 'add',
      });
    }

    if (user.isBanned) {
      await interaction.reply({
        components: [
          errorContainer(
            'You are banned from using this bot.\nPlease contact support if you believe this is an error.'
          ),
        ],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
      return;
    }

    await interaction.reply({
      components: [addAccountContainer()],
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    });
  },
  interactions: {
    button: addButtonInteractions,
    modal: addModalInteractions,
  },
};

/** @param {import("discord.js").ButtonInteraction} interaction */
async function handleAgreeButton(interaction) {
  await Users.create(interaction.user.id);
  await interaction.update({
    components: [
      textContainer(
        "You're all set! Use `/add account` to add your first account, then you can start using all the features of Endvoyant."
      ),
    ],
    flags: [MessageFlags.IsComponentsV2],
  });

  await sleep(5000);
  await interaction.editReply({
    components: [addAccountContainer()],
    flags: [MessageFlags.IsComponentsV2],
  });
}

/** @param {import("discord.js").ButtonInteraction} interaction */
async function handleLoginButton(interaction) {
  await interaction.showModal(loginModal());
}

/** @param {import("discord.js").ButtonInteraction} interaction */
async function handleTokenButton(interaction) {
  await interaction.showModal(cookieModal());
}

/** @param {import("discord.js").ButtonInteraction} interaction */
async function handleInfoButton(interaction) {
  const infoContainer = new ContainerBuilder()
    .addTextDisplayComponents((textDisplay) => textDisplay.setContent('## ▼// Linking Information'))
    .addSeparatorComponents((separator) => separator)
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        [
          '### Linking with Login',
          'This is the **recommended** and most straightforward method to link your account. ',
        ].join('\n')
      )
    )
    .addSeparatorComponents((separator) => separator)
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        [
          '### Linking with Token',
          'This method requires you to log into SKPort and copy the Cookie value from the browser. There is currently no downsides to using this method and still being tested.',
          '',
          'Getting the cookies:',
          '1. Go to [skport.com](<https://game.skport.com/endfield/sign-in>) do __NOT__ log in yet.',
          "2. Open your browser's developer tools ([How to open DevTools](https://balsamiq.com/support/faqs/browserconsole/))",
          '3. Navigate to the **“Network”** tab in developer tools.',
          '4. Now log in with the developer tools open, you should see things populate in the network tab.',
          '5. In the search box, type **token** and click on the result labeled **account_token**.',
          '6. Under the **Headers** tab, locate the **Request** section.',
          '7. Copy everything after **Cookie:** and paste it into the text field provided.',
        ].join('\n')
      )
    );

  await interaction.reply({
    components: [infoContainer],
    flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
  });
}

/** @param {import("discord.js").ModalSubmitInteraction} interaction */
async function handleLoginModal(interaction) {
  await handleAddModalSubmission(interaction, getLoginDataFromCredentials);
}

/** @param {import("discord.js").ModalSubmitInteraction} interaction */
async function handleTokenModal(interaction) {
  await handleAddModalSubmission(interaction, getLoginDataFromCookie);
}

/**
 * @param {import("discord.js").ModalSubmitInteraction} interaction
 * @param {(interaction: import("discord.js").ModalSubmitInteraction) => Promise<{ token: string, hgId: string } | null>} getLoginData
 */
async function handleAddModalSubmission(interaction, getLoginData) {
  await interaction.deferUpdate();

  const loginData = await getLoginData(interaction);
  // No need to edit since its handled inside function
  if (!loginData) return;

  await interaction.editReply({
    components: [textContainer('Attempting to grant credentials...')],
    flags: [MessageFlags.IsComponentsV2],
  });

  const oauth = await grantOAuth({ token: loginData.token, appCode: '6eb76d4e13aa36e6' });
  if (!oauth || oauth.status !== 0) {
    await interaction.editReply({
      components: [errorContainer(oauth.msg || 'Failed to grant OAuth token')],
      flags: [MessageFlags.IsComponentsV2],
    });
    return;
  }

  const cred = await generateCredByCode({ code: oauth.data.code });
  if (!cred || cred.status !== 0) {
    await interaction.editReply({
      components: [errorContainer(cred.msg || 'Failed to generate credentials')],
      flags: [MessageFlags.IsComponentsV2],
    });
    return;
  }

  const binding = await getBinding({ cred: cred.data.cred, token: cred.data.token });
  if (!binding || binding.status !== 0) {
    await interaction.editReply({
      components: [errorContainer(binding.msg || 'Failed to get binding')],
      flags: [MessageFlags.IsComponentsV2],
    });
    return;
  }

  const endfield = binding.data.find((b) => b.appCode === 'endfield');
  if (!endfield) {
    await interaction.editReply({
      components: [errorContainer('Failed to find Endfield binding')],
      flags: [MessageFlags.IsComponentsV2],
    });
    return;
  }

  const selectedBinding = endfield.bindingList.find((b) => b.isDefault) ?? endfield.bindingList[0];

  if (!selectedBinding || !selectedBinding.defaultRole) {
    await interaction.editReply({
      components: [warningContainer('No game role found for this binding.')],
      flags: [MessageFlags.IsComponentsV2],
    });
    return;
  }

  await interaction.editReply({
    components: [textContainer('Account confirmed, attempting to store data...')],
    flags: [MessageFlags.IsComponentsV2],
  });

  if (selectedBinding.defaultRole.isBanned) {
    await interaction.editReply({
      components: [warningContainer('The account is banned.')],
      flags: [MessageFlags.IsComponentsV2],
    });
    return;
  }

  const existingAccount = await Accounts.doesAccountExist(
    loginData.hgId,
    selectedBinding.defaultRole.roleId,
    selectedBinding.defaultRole.serverId
  );

  if (existingAccount.doesExist) {
    const isOwnedByUser = existingAccount.dcid === interaction.user.id;
    await interaction.editReply({
      components: [alreadyLinkedContainer(isOwnedByUser, existingAccount.dcid ?? '')],
      flags: [MessageFlags.IsComponentsV2],
    });
    return;
  }

  const accounts = await Accounts.getByDcid(interaction.user.id);
  if (accounts.length >= 5) {
    await interaction.editReply({
      components: [errorContainer('You have reached the maximum number of accounts.')],
      flags: [MessageFlags.IsComponentsV2],
    });
    return;
  }

  await Accounts.create(interaction.user.id, {
    nickname: selectedBinding.defaultRole.nickname,
    accountToken: loginData.token,
    hgId: loginData.hgId,
    userId: cred.data.userId,
    channelId: selectedBinding.channelMasterId,
    serverType: selectedBinding.defaultRole.serverType,
    serverId: selectedBinding.defaultRole.serverId,
    serverName: selectedBinding.defaultRole.serverName,
    roleId: selectedBinding.defaultRole.roleId,
    isPrimary: (await Accounts.getByDcid(interaction.user.id)).length === 0,
  });

  await interaction.editReply({
    components: [
      textContainer(
        [
          '## Login completed successfully!',
          'The following account has been added to your Discord account:\n',
          `Nickname: \`${selectedBinding.defaultRole.nickname}\``,
          `UID: \`${selectedBinding.defaultRole.roleId}\``,
          `Authority Level: \`${selectedBinding.defaultRole.level}\``,
          `Server: \`${selectedBinding.defaultRole.serverName}\``,
          '\nDiscord Server: https://discord.gg/5rUsSZTyf2',
        ].join('\n')
      ),
    ],
    flags: [MessageFlags.IsComponentsV2],
  });

  if (interaction.inGuild()) {
    try {
      const message = await interaction.user.send({
        components: [
          textContainer(
            [
              '## ▼// Account Linked',
              `Nickname: \`${selectedBinding.defaultRole.nickname}\``,
              `UID: \`${selectedBinding.defaultRole.roleId}\``,
              `Server: \`${selectedBinding.defaultRole.serverName}\``,
            ].join('\n')
          ),
        ],
        flags: [MessageFlags.IsComponentsV2],
      });

      await message.pin();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await interaction.followUp({
        components: [textContainer(`Please ensure the bot has permissions to DM you.\n${message}`)],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
    }
  }
}

/** @param {import("discord.js").ModalSubmitInteraction} interaction */
async function getLoginDataFromCredentials(interaction) {
  const email = interaction.fields.getTextInputValue('email');
  const password = interaction.fields.getTextInputValue('password');

  await interaction.editReply({
    components: [textContainer('Attempting to login...')],
    flags: [MessageFlags.IsComponentsV2],
  });

  const login = await tokenByEmailPassword(email, password);
  if (login.status !== 0) {
    await interaction.editReply({
      components: [errorContainer(login.msg)],
      flags: [MessageFlags.IsComponentsV2],
    });
    return null;
  }

  return { token: login.data.token, hgId: login.data.hgId };
}

/** @param {import("discord.js").ModalSubmitInteraction} interaction */
async function getLoginDataFromCookie(interaction) {
  const cookieToken = interaction.fields.getTextInputValue('token');

  await interaction.editReply({
    components: [textContainer('Attempting to parse cookie token...')],
    flags: [MessageFlags.IsComponentsV2],
  });

  const parsed = parseCookieToken(cookieToken);
  if (!parsed) {
    await interaction.editReply({
      components: [
        errorContainer(
          'Failed to parse cookie. Ensure it contains ACCOUNT_TOKEN, SK_OAUTH_CRED_KEY, and HG_INFO_KEY (with hgId).'
        ),
      ],
      flags: [MessageFlags.IsComponentsV2],
    });
    return null;
  }

  return { token: parsed.token, hgId: parsed.hgId };
}
