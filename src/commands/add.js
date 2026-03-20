import { ContainerBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import {
  textContainer,
  errorContainer,
  warningContainer,
  onboardingContainer,
  addAccountContainer,
  alreadyLinkedContainer,
  loginModal,
  cookieModal,
} from '#/components/index.js';
import { Accounts, Events, Users } from '#/db/index.js';
import {
  generateCredByCode,
  getBinding,
  grantOAuth,
  tokenByEmailPassword,
} from '#/skport/api/index.js';
import { parseCookieToken, sleep } from '#/utils/index.js';
import { BotConfig } from '#/config';

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
      await Events.create(interaction.user.id, {
        source: 'slash',
        action: 'add',
      });
    }

    await interaction.reply({
      components: [addAccountContainer()],
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    });
  },
  /** @param {import("discord.js").ButtonInteraction} interaction */
  async button(interaction) {
    const customId = interaction.customId.split('-')[1];

    if (customId === 'agree') {
      await Users.create(interaction.user.id);
      await interaction.update({
        components: [
          textContainer(
            "You're all set! Use `/add account` to add your first account, then you can start using all the features of Endvoyant."
          ),
        ],
        flags: [MessageFlags.IsComponentsV2],
      });

      // Wait for 5 seconds before redirecting to the add account command
      await sleep(5000);
      await interaction.editReply({
        components: [addAccountContainer()],
        flags: [MessageFlags.IsComponentsV2],
      });
    } else if (customId === 'login') {
      await interaction.showModal(loginModal());
    } else if (customId === 'token') {
      await interaction.showModal(cookieModal());
    } else if (customId === 'info') {
      const infoContainer = new ContainerBuilder()
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent('## ▼// Linking Information')
        )
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
  },
  /** @param {import("discord.js").ModalSubmitInteraction} interaction */
  async modal(interaction) {
    await interaction.deferUpdate();
    const customId = interaction.customId.split('-')[1];

    /** @type {{ token: string, hgId: string } | null} */
    let loginData = null;

    if (customId === 'login') {
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
        return;
      }

      loginData = { token: login.data.token, hgId: login.data.hgId };
    } else if (customId === 'token') {
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
        return;
      }

      loginData = { token: parsed.token, hgId: parsed.hgId };
    }

    if (!loginData) {
      await interaction.editReply({
        components: [errorContainer('Failed to get login data')],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

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

    const selectedBinding =
      endfield.bindingList.find((b) => b.isDefault) ?? endfield.bindingList[0];

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

    // Somehow they got banned...
    if (selectedBinding.defaultRole.isBanned) {
      await interaction.editReply({
        components: [warningContainer('The account is banned.')],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    // Check if the account is already added
    const existingAccount = await Accounts.doesAccountExist(
      loginData.hgId,
      selectedBinding.defaultRole.roleId,
      selectedBinding.defaultRole.serverId
    );

    // Account already linked by someone
    if (existingAccount.doesExist) {
      const isOwnedByUser = existingAccount.dcid === interaction.user.id;
      await interaction.editReply({
        components: [alreadyLinkedContainer(isOwnedByUser, existingAccount.dcid ?? '')],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    // Max of 5 accounts per user
    const accounts = await Accounts.getByDcid(interaction.user.id);
    if (accounts.length >= 5) {
      await interaction.editReply({
        components: [errorContainer('You have reached the maximum number of accounts.')],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    // Add the account to the database
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
      } catch (/** @type {any} */ error) {
        await interaction.followUp({
          components: [
            textContainer(`Please ensure the bot has permissions to DM you.\n${error.message}`),
          ],
          flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
        });
      }
    }
  },
};
