import {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { createComponentId } from '#/utils/componentId.js';
import { privacy } from '#/utils/privacy.js';

export function onboardingContainer() {
  const container = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
    textDisplay.setContent(
      [
        '## ▼// Welcome to Endvoyant!',
        'Before you continue, please read our Terms of Service and Privacy Policy.',
        '-# Terms of Service: <https://ake.xentriom.com/docs/terms-of-service>',
        '-# Privacy Policy: <https://ake.xentriom.com/docs/privacy-policy>',
        '',
        'By clicking the button below, you **agree** to our Terms of Service and Privacy Policy.',
        'If you do not agree, simply dismiss the message.',
      ].join('\n')
    )
  );

  const agreeButton = new ButtonBuilder()
    .setCustomId(createComponentId('add', 'agree'))
    .setLabel('I Agree')
    .setStyle(ButtonStyle.Success);
  container.addActionRowComponents((row) => row.addComponents(agreeButton));

  return container;
}

export function addAccountContainer() {
  const container = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
    textDisplay.setContent(
      [
        '## ▼// Add your SKPort account',
        'Please select a method to add your account:',
        '- SKPork Login: Use your email and password to login to SKPort.',
        '- Enter Cookies: Use your cookies to login to SKPort.',
        '-# Multiple Accounts can be added by using the `/add account` command again.',
        '',
        'The source code is avaialable on [GitHub](https://github.com/ScobbleQ/Endministrator). We **do not** store your login credentials after the login process is completed. Need help? Join our [Support Server](https://discord.gg/5rUsSZTyf2).',
      ].join('\n')
    )
  );

  const loginButton = new ButtonBuilder()
    .setCustomId(createComponentId('add', 'login'))
    .setLabel('SKPort Login')
    .setStyle(ButtonStyle.Primary);

  const tokenButton = new ButtonBuilder()
    .setCustomId(createComponentId('add', 'token'))
    .setLabel('Enter Cookies')
    .setStyle(ButtonStyle.Primary);

  const infoButton = new ButtonBuilder()
    .setCustomId(createComponentId('add', 'info'))
    .setEmoji({ name: 'circleinfo', id: '1468282138209292482' })
    .setStyle(ButtonStyle.Secondary);

  container.addActionRowComponents((row) =>
    row.addComponents(loginButton, tokenButton, infoButton)
  );

  return container;
}

/**
 * Container for when an account is already to a Discord profile
 * @param {boolean} isOwnedByUser
 * @param {string} dcid
 */
export function alreadyLinkedContainer(isOwnedByUser, dcid) {
  const msg = isOwnedByUser
    ? `This account is already linked to your Discord profile.`
    : `This account is already linked to a different Discord profile (${privacy(dcid, true)}). If this is yours, contact support to recover access.`;

  return new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
    textDisplay.setContent(msg)
  );
}

export function loginModal() {
  const modal = new ModalBuilder()
    .setCustomId(createComponentId('add', 'login'))
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

  modal.addLabelComponents(emailLabel, passwordLabel);
  return modal;
}

export function cookieModal() {
  const modal = new ModalBuilder()
    .setCustomId(createComponentId('add', 'token'))
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

  modal.addLabelComponents(tokenLabel);
  return modal;
}
