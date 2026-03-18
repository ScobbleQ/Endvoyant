import { ButtonBuilder, ButtonStyle, ContainerBuilder } from 'discord.js';

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
    .setCustomId('add-login')
    .setLabel('SKPort Login')
    .setStyle(ButtonStyle.Primary);

  const tokenButton = new ButtonBuilder()
    .setCustomId('add-token')
    .setLabel('Enter Cookies')
    .setStyle(ButtonStyle.Primary);

  const infoButton = new ButtonBuilder()
    .setCustomId('add-info')
    .setEmoji({ name: 'circleinfo', id: '1468282138209292482' })
    .setStyle(ButtonStyle.Secondary);

  container.addActionRowComponents((row) =>
    row.addComponents(loginButton, tokenButton, infoButton)
  );

  return container;
}
