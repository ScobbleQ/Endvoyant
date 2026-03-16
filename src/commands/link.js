import {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  SlashCommandBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { createEndfieldAccount, getUser } from '../db/queries.js';
import {
  generateCredByCode,
  getBinding,
  grantOAuth,
  tokenByEmailPassword,
} from '../skport/api/index.js';
import { textContainer } from '../utils/containers.js';
import { parseCookieToken } from '../utils/parseCookieToken.js';

export default {
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Link your SKPort account to your Discord account')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('account')
        .setDescription('Link your SKPort account to your Discord account')
    )
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  /** @param {import("discord.js").ChatInputCommandInteraction} interaction */
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand !== 'account') {
      await interaction.reply({
        components: [textContainer('Invalid subcommand')],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
      return;
    }

    const user = await getUser(interaction.user.id);
    if (user) {
      await interaction.reply({
        components: [
          textContainer(
            'Only one account can be linked per Discord account. Multiple accounts will be supported in the future.'
          ),
        ],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
      return;
    }

    const container = new ContainerBuilder();

    const textDisplay = new TextDisplayBuilder().setContent(
      [
        '## ▼// Link your SKPort account',
        'By clicking the button below, you agree to our [Terms of Service](https://github.com/ScobbleQ/Endministrator) and [Privacy Policy](https://github.com/ScobbleQ/Endministrator).',
        '',
        'The source code is avaialable on [GitHub](https://github.com/ScobbleQ/Endministrator) if you have any doubts to how we handle your login proccess and data. Rest assured, we do not store any of your login credentials after the login process is completed.',
      ].join('\n')
    );
    container.addTextDisplayComponents(textDisplay);

    const loginButton = new ButtonBuilder()
      .setCustomId('link-login')
      .setLabel('SKPort Login')
      .setStyle(ButtonStyle.Primary);

    const tokenButton = new ButtonBuilder()
      .setCustomId('link-token')
      .setLabel('Enter Cookies')
      .setStyle(ButtonStyle.Primary);

    const infoButton = new ButtonBuilder()
      .setCustomId('link-info')
      .setEmoji({ name: 'circleinfo', id: '1468282138209292482' })
      .setStyle(ButtonStyle.Secondary);

    container.addActionRowComponents((row) =>
      row.addComponents(loginButton, tokenButton, infoButton)
    );

    await interaction.reply({
      components: [container],
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    });
  },
  /** @param {import("discord.js").ButtonInteraction} interaction */
  async button(interaction) {
    const customId = interaction.customId.split('-')[1];

    if (customId === 'login') {
      const loginModal = new ModalBuilder()
        .setCustomId('link-login')
        .setTitle('Link your SKPort account');

      const emailInput = new TextInputBuilder()
        .setCustomId('email')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('placeholder text')
        .setRequired(true);

      const emailLabel = new LabelBuilder()
        .setLabel('Email')
        .setDescription('Enter your email address')
        .setTextInputComponent(emailInput);

      const passwordInput = new TextInputBuilder()
        .setCustomId('password')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('placeholder text')
        .setRequired(true);

      const passwordLabel = new LabelBuilder()
        .setLabel('Password')
        .setDescription('Enter your password')
        .setTextInputComponent(passwordInput);

      loginModal.addLabelComponents(emailLabel, passwordLabel);
      await interaction.showModal(loginModal);
    } else if (customId === 'token') {
      const tokenModal = new ModalBuilder()
        .setCustomId('link-token')
        .setTitle('Link your SKPort account');

      const tokenInput = new TextInputBuilder()
        .setCustomId('token')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('ACCOUNT_TOKEN=___; ssxmod_itna=___; ssxmod_itna2=___; ...etc')
        .setRequired(true);

      const tokenLabel = new LabelBuilder()
        .setLabel('Cookies')
        .setDescription('Enter your cookies')
        .setTextInputComponent(tokenInput);

      tokenModal.addLabelComponents(tokenLabel);
      await interaction.showModal(tokenModal);
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

      const initContainer = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent('Attempting to login...')
      );

      await interaction.editReply({
        components: [initContainer],
        flags: [MessageFlags.IsComponentsV2],
      });

      const login = await tokenByEmailPassword(email, password);
      if (login.status !== 0) {
        const errorContainer = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(login.msg)
        );
        await interaction.editReply({
          components: [errorContainer],
          flags: [MessageFlags.IsComponentsV2],
        });
        return;
      }

      loginData = { token: login.data.token, hgId: login.data.hgId };
    } else if (customId === 'token') {
      const cookieToken = interaction.fields.getTextInputValue('token');
      const initContainer = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent('Attempting to parse cookie token...')
      );

      await interaction.editReply({
        components: [initContainer],
        flags: [MessageFlags.IsComponentsV2],
      });

      const parsed = parseCookieToken(cookieToken);
      if (!parsed) {
        const errorContainer = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            'Failed to parse cookie. Ensure it contains ACCOUNT_TOKEN, SK_OAUTH_CRED_KEY, and HG_INFO_KEY (with hgId).'
          )
        );
        await interaction.editReply({
          components: [errorContainer],
          flags: [MessageFlags.IsComponentsV2],
        });
        return;
      }

      loginData = { token: parsed.token, hgId: parsed.hgId };
    }

    if (!loginData) {
      const errorContainer = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent('Failed to get login data')
      );
      await interaction.editReply({
        components: [errorContainer],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    // Login is successful, now get the needed data to continue
    const credContainer = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent('Attempting to grant credentials...')
    );

    await interaction.editReply({
      components: [credContainer],
      flags: [MessageFlags.IsComponentsV2],
    });

    const oauth = await grantOAuth({ token: loginData.token, appCode: '6eb76d4e13aa36e6' });
    if (!oauth || oauth.status !== 0) {
      const oauthErrorContainer = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(oauth.msg || 'Failed to grant OAuth token')
      );
      await interaction.editReply({
        components: [oauthErrorContainer],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    const cred = await generateCredByCode({ code: oauth.data.code });
    if (!cred || cred.status !== 0) {
      const credErrorContainer = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(cred.msg || 'Failed to generate credentials')
      );
      await interaction.editReply({
        components: [credErrorContainer],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    const binding = await getBinding({ cred: cred.data.cred, token: cred.data.token });
    if (!binding || binding.status !== 0) {
      const bindingErrorContainer = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(binding.msg || 'Failed to get binding')
      );
      await interaction.editReply({
        components: [bindingErrorContainer],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    const endfield = binding.data.find((b) => b.appCode === 'endfield');
    if (!endfield) {
      const endfieldErrorContainer = new ContainerBuilder().addTextDisplayComponents(
        (textDisplay) => textDisplay.setContent('Failed to find Endfield binding')
      );
      await interaction.editReply({
        components: [endfieldErrorContainer],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    const selectedBinding =
      endfield.bindingList.find((b) => b.isDefault) ?? endfield.bindingList[0];

    if (!selectedBinding || !selectedBinding.defaultRole) {
      const noRoleContainer = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent('No game role found for this binding.')
      );
      await interaction.editReply({
        components: [noRoleContainer],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    const foundContainer = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent('Account confirmed, attempting to store data...')
    );

    await interaction.editReply({
      components: [foundContainer],
      flags: [MessageFlags.IsComponentsV2],
    });

    // Somehow they got banned...
    if (selectedBinding.defaultRole.isBanned) {
      const bannedContainer = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent('The account is banned.')
      );
      await interaction.editReply({
        components: [bannedContainer],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    // Add the account to the database
    await createEndfieldAccount(interaction.user.id, {
      nickname: selectedBinding.defaultRole.nickname,
      accountToken: loginData.token,
      hgId: loginData.hgId,
      userId: cred.data.userId,
      channelId: selectedBinding.channelMasterId,
      serverType: selectedBinding.defaultRole.serverType,
      serverId: selectedBinding.defaultRole.serverId,
      serverName: selectedBinding.defaultRole.serverName,
      roleId: selectedBinding.defaultRole.roleId,
    });

    const successContainer = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        [
          '## Login completed successfully!',
          'The following account has been added to your Discord account:\n',
          `Nickname: \`${selectedBinding.defaultRole.nickname}\``,
          `UID: \`${selectedBinding.defaultRole.roleId}\``,
          `Authority Level: \`${selectedBinding.defaultRole.level}\``,
          `Server: \`${selectedBinding.defaultRole.serverName}\``,
          '\nDiscord Server: https://discord.gg/5rUsSZTyf2',
        ].join('\n')
      )
    );

    await interaction.editReply({
      components: [successContainer],
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
