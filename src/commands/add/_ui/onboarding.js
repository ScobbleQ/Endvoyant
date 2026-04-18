import { ButtonBuilder, ButtonStyle, ContainerBuilder } from 'discord.js';
import { createComponentId } from '#/utils/componentId.js';

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
