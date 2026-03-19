import { ModalBuilder, TextInputBuilder, TextInputStyle, LabelBuilder } from 'discord.js';

export function cookieModal() {
  const modal = new ModalBuilder().setCustomId('add-token').setTitle('Link your SKPort account');

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
