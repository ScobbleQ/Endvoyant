import { ButtonBuilder, ButtonStyle, ContainerBuilder, TextDisplayBuilder } from 'discord.js';
import { privacy } from './privacy.js';

export const MessageTone = {
  Formal: 'formal',
  Informal: 'informal',
};

/**
 *
 * @param {{ tone?: typeof MessageTone[keyof typeof MessageTone] }} param0
 * @returns {ContainerBuilder}
 */
export function noUserContainer({ tone = MessageTone.Formal }) {
  const msg =
    tone === MessageTone.Formal
      ? 'Please log in with `/login` to continue.'
      : "Hey, you're not logged in! Use `/login` to get started.";

  return new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
    textDisplay.setContent(msg)
  );
}

export function alreadyLoggedInContainer({ tone = MessageTone.Formal }) {
  const msg =
    tone === MessageTone.Formal ? 'You are already logged in.' : "Hey, you're already logged in!";

  return new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
    textDisplay.setContent(msg)
  );
}

export function oauthErrorContainer() {
  return new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
    textDisplay.setContent('Failed to grant OAuth token')
  );
}

export function credErrorContainer() {
  return new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
    textDisplay.setContent('Failed to generate credentials')
  );
}

export function bindingErrorContainer() {
  return new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
    textDisplay.setContent('Failed to get binding')
  );
}

export function maintenanceContainer() {
  return new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
    textDisplay.setContent('This command is currently under maintenance and unavailable.')
  );
}

/**
 * @param {string} text
 * @returns {ContainerBuilder}
 */
export function textContainer(text) {
  return new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
    textDisplay.setContent(text)
  );
}
