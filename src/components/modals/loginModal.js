import { ModalBuilder, TextInputBuilder, TextInputStyle, LabelBuilder } from 'discord.js';

export function loginModal() {
  const modal = new ModalBuilder().setCustomId('add-login').setTitle('Link your SKPort account');

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
