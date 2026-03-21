import type {
  AutocompleteInteraction,
  ButtonInteraction,
  ChatInputCommandInteraction,
  Collection,
  ContextMenuCommandInteraction,
  ModalSubmitInteraction,
  SlashCommandBuilder,
  StringSelectMenuInteraction,
} from 'discord.js';

export type CommandData = SlashCommandBuilder & {
  cooldown?: number;
};

export interface CommandModule {
  data: CommandData;
  execute(
    interaction: ChatInputCommandInteraction | ContextMenuCommandInteraction
  ): Promise<unknown>;
  autocomplete?(interaction: AutocompleteInteraction): Promise<unknown>;
  button?(interaction: ButtonInteraction, ...args: string[]): Promise<unknown>;
  modal?(interaction: ModalSubmitInteraction, ...args: string[]): Promise<unknown>;
  selectMenu?(interaction: StringSelectMenuInteraction, ...args: string[]): Promise<unknown>;
}

export type Cooldowns = Collection<string, Collection<string, number>>;

declare module 'discord.js' {
  interface Client<Ready extends boolean = boolean> {
    commands: Collection<string, CommandModule>;
    cooldowns: Cooldowns;
  }
}
