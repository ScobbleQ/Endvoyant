import {
  ButtonStyle,
  ContainerBuilder,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  WebhookClient,
} from 'discord.js';
import { BotConfig } from '../../config.js';
import { textContainer } from '../utils/containers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('survey')
    .setDescription('View surveys to improve the bot')
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  /** @param {import("discord.js").ChatInputCommandInteraction} interaction */
  async execute(interaction) {
    const container = new ContainerBuilder();
    container.addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        '## Surveys\nYour input shapes what we build next. Each survey is optional—open any that apply. '
      )
    );

    container.addSectionComponents((section) =>
      section
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            '### Multiple Accounts\nLinking more than one Endfield account (e.g. global + regional) to this Discord.'
          )
        )
        .setButtonAccessory((button) =>
          button.setCustomId('survey-account').setLabel('Open survey').setStyle(ButtonStyle.Primary)
        )
    );

    container.addSectionComponents((section) =>
      section
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            '### Suggestions & Feedback\nNew commands, QoL ideas, bug reports, or UX feedback.'
          )
        )
        .setButtonAccessory((button) =>
          button
            .setCustomId('survey-suggestions')
            .setLabel('Open survey')
            .setStyle(ButtonStyle.Primary)
        )
    );

    container.addSectionComponents((section) =>
      section
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            '### Image Generation\nShareable images from the bot (e.g. character builds, operator cards).'
          )
        )
        .setButtonAccessory((button) =>
          button.setCustomId('survey-image').setLabel('Open survey').setStyle(ButtonStyle.Primary)
        )
    );

    await interaction.reply({
      components: [container],
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    });
  },
  /** @param {import("discord.js").ButtonInteraction} interaction */
  async button(interaction) {
    const customId = interaction.customId.split('-')[1];

    if (customId === 'account') {
      const modal = new ModalBuilder()
        .setCustomId('survey-account')
        .setTitle('Survey: Multiple Accounts');

      const accountInput = new TextInputBuilder()
        .setCustomId('account')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g. Yes')
        .setRequired(true);

      const accountLabel = new LabelBuilder()
        .setLabel('Want multiple account linking?')
        .setDescription(
          'Would you want to link more than one Endfield account (e.g. alts) to this Discord? Yes or no.'
        )
        .setTextInputComponent(accountInput);

      const accountScaleInput = new TextInputBuilder()
        .setCustomId('scale')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('1-10')
        .setRequired(true);

      const accountScaleLabel = new LabelBuilder()
        .setLabel('Impact (1-10)')
        .setDescription(
          'How much would linking multiple Endfield accounts improve your experience?'
        )
        .setTextInputComponent(accountScaleInput);

      modal.addLabelComponents(accountLabel, accountScaleLabel);
      await interaction.showModal(modal);
    } else if (customId === 'suggestions') {
      const modal = new ModalBuilder()
        .setCustomId('survey-suggestions')
        .setTitle('Survey: Suggestions & Feedback');

      const suggestionsInput = new TextInputBuilder()
        .setCustomId('suggestions')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Your ideas, bugs, or feedback…')
        .setRequired(true);

      const suggestionsLabel = new LabelBuilder()
        .setLabel('Your suggestions or feedback')
        .setDescription(
          'New commands, QoL ideas, bugs, or UX feedback. The more specific, the better.'
        )
        .setTextInputComponent(suggestionsInput);

      const suggestionsScaleInput = new TextInputBuilder()
        .setCustomId('scale')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('1-10')
        .setRequired(true);

      const suggestionsScaleLabel = new LabelBuilder()
        .setLabel('Importance (1-10)')
        .setDescription('How important is it that we address this feedback or suggestion?')
        .setTextInputComponent(suggestionsScaleInput);

      modal.addLabelComponents(suggestionsLabel, suggestionsScaleLabel);
      await interaction.showModal(modal);
    } else if (customId === 'image') {
      const modal = new ModalBuilder()
        .setCustomId('survey-image')
        .setTitle('Survey: Image Generation');

      const imageInput = new TextInputBuilder()
        .setCustomId('image')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g. Yes')
        .setRequired(true);

      const imageLabel = new LabelBuilder()
        .setLabel('Would you use image generation?')
        .setDescription(
          'Image output for builds, operator cards, etc. Would you use it? Yes or no.'
        )
        .setTextInputComponent(imageInput);

      const imageScaleInput = new TextInputBuilder()
        .setCustomId('scale')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('1-10')
        .setRequired(true);

      const imageScaleLabel = new LabelBuilder()
        .setLabel('Impact (1-10)')
        .setDescription(
          'How much would image generation (builds, operator cards) improve your experience?'
        )
        .setTextInputComponent(imageScaleInput);

      modal.addLabelComponents(imageLabel, imageScaleLabel);
      await interaction.showModal(modal);
    }
  },
  /** @param {import("discord.js").ModalSubmitInteraction} interaction */
  async modal(interaction) {
    const customId = interaction.customId.split('-')[1];

    const data = [];

    // global fields from modal
    const scale = interaction.fields.getTextInputValue('scale');
    data.push({ label: 'Scale', value: scale });

    if (customId === 'account') {
      const account = interaction.fields.getTextInputValue('account');
      data.push({ label: 'Multiple Accounts', value: account });
    } else if (customId === 'suggestions') {
      const suggestions = interaction.fields.getTextInputValue('suggestions');
      data.push({ label: 'Suggestions & Feedback', value: suggestions });
    } else if (customId === 'image') {
      const image = interaction.fields.getTextInputValue('image');
      data.push({ label: 'Image Generation', value: image });
    }

    const webhook = new WebhookClient({ url: BotConfig.webhooks.survey });
    await webhook.send({
      content: `**${interaction.user.username}** (${interaction.user.id})`,
      embeds: [
        new EmbedBuilder()
          .setTitle(`Survey Response: ${customId}`)
          .addFields(data.map((field) => ({ name: field.label, value: field.value }))),
      ],
    });

    await interaction.reply({
      components: [textContainer('Thank you for your input!')],
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    });
  },
};
