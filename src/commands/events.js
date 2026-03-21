import {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import { errorContainer } from '#/components/index.js';
import { Events as DbEvents } from '#/db/index.js';
import { getCachedEnrichedEvents } from '#/skport/utils/getCachedEvents.js';
import { createComponentId } from '#/utils/componentId.js';
import { BotConfig } from '#/config';

const eventButtonInteractions = {
  catalog: showEventsCatalog,
  page: showEventsCatalog,
  view: showEventDetail,
};

/** @typedef {import('#/types/skport/game.js').CachedBulletinEvent} CachedBulletinEvent */

const EVENTS_PER_PAGE = 5;
const MAX_BODY_LENGTH = 3800;
const MEDIA_GALLERY_MAX_ITEMS = 10;

/** @param {string} s */
function decodeHtmlEntities(s) {
  return s
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

/**
 * @param {string} url
 * @returns {string | null} Null if not usable as a gallery URL
 */
function normalizeImageUrl(url) {
  const t = url.trim();
  if (!t || t.startsWith('data:')) return null;
  if (t.startsWith('//')) return `https:${t}`;
  if (t.startsWith('/')) return `https://web-static.hg-cdn.com${t}`;
  if (/^https?:\/\//i.test(t)) return t;
  return null;
}

/**
 * Ordered unique `src` values from `<img>` tags.
 * @param {string | undefined} html
 * @returns {string[]}
 */
function extractImgSrcs(html) {
  if (!html || typeof html !== 'string') return [];
  /** @type {string[]} */
  const out = [];
  const seen = new Set();
  const imgTagRe = /<img\b[^>]*>/gi;
  for (const match of html.matchAll(imgTagRe)) {
    const tag = match[0];
    const quoted = /\bsrc\s*=\s*["']([^"']*)["']/i.exec(tag);
    const raw = quoted?.[1] ?? /\bsrc\s*=\s*([^\s>]+)/i.exec(tag)?.[1];
    if (!raw) continue;
    const url = normalizeImageUrl(decodeHtmlEntities(raw.trim()));
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

/** @param {string | undefined} html */
function htmlToPlain(html) {
  if (!html || typeof html !== 'string') return '';
  let s = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/·/g, '-')
    .trim();

  s = s
    .split('\n')
    .map((line) => {
      const trimmed = line.trimStart();
      if (trimmed.startsWith('▼//') || trimmed.startsWith('■')) {
        return `**${line.trim()}**`;
      }
      return line;
    })
    .join('\n');

  if (s.length > MAX_BODY_LENGTH) {
    s = `${s.slice(0, MAX_BODY_LENGTH - 1)}…`;
  }
  return s;
}

/** @param {number} startAt */
function formatStartAt(startAt) {
  if (startAt == null || !Number.isFinite(startAt)) return null;
  const ts = startAt > 1e11 ? Math.floor(startAt / 1000) : Math.floor(startAt);
  if (ts <= 0) return null;
  return `<t:${ts}:F>`;
}

/**
 * @param {CachedBulletinEvent[]} list
 * @param {number} page
 */
function buildCatalogContainer(list, page) {
  const totalPages = Math.max(1, Math.ceil(list.length / EVENTS_PER_PAGE));
  const clampedPage = Math.min(Math.max(0, page), totalPages - 1);
  const slice = list.slice(clampedPage * EVENTS_PER_PAGE, (clampedPage + 1) * EVENTS_PER_PAGE);

  const container = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
    textDisplay.setContent('## ▼// Game events')
  );

  if (list.length === 0) {
    container.addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent('No events available right now.')
    );
    return container;
  }

  for (const ev of slice) {
    const when = formatStartAt(ev.startAt);
    const lines = [`**${ev.header || 'Event'}**`];
    if (when) lines.push(`Starts ${when}`);
    else if (ev.title && ev.title !== ev.header) lines.push(ev.title);

    container.addSectionComponents((section) =>
      section
        .addTextDisplayComponents((textDisplay) => textDisplay.setContent(lines.join('\n')))
        .setButtonAccessory((button) =>
          button
            .setCustomId(createComponentId('events', 'view', ev.cid, String(clampedPage)))
            .setLabel('View event')
            .setStyle(ButtonStyle.Primary)
        )
    );
  }

  if (list.length > EVENTS_PER_PAGE) {
    const prevPage = Math.max(0, clampedPage - 1);
    const nextPage = Math.min(totalPages - 1, clampedPage + 1);

    container.addActionRowComponents((actionRow) =>
      actionRow.addComponents(
        new ButtonBuilder()
          .setCustomId(createComponentId('events', 'page', String(prevPage)))
          .setLabel('Previous')
          .setStyle(clampedPage === 0 ? ButtonStyle.Secondary : ButtonStyle.Success)
          .setDisabled(clampedPage === 0),
        new ButtonBuilder()
          .setCustomId(createComponentId('events', 'page', 'display'))
          .setLabel(`${clampedPage + 1} / ${totalPages}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId(createComponentId('events', 'page', String(nextPage)))
          .setLabel('Next')
          .setStyle(clampedPage >= totalPages - 1 ? ButtonStyle.Secondary : ButtonStyle.Success)
          .setDisabled(clampedPage >= totalPages - 1)
      )
    );
  }

  return container;
}

/**
 * @param {CachedBulletinEvent} ev
 * @param {number} catalogPage
 */
function buildEventDetailContainer(ev, catalogPage) {
  const imageUrls = extractImgSrcs(ev.html);
  const body = htmlToPlain(ev.html);

  const container = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
    textDisplay.setContent(`## ▼// ${ev.header}`)
  );

  const hasGallery = imageUrls.length > 0;
  const hasBody = Boolean(body);

  if (hasGallery) {
    for (let i = 0; i < imageUrls.length; i += MEDIA_GALLERY_MAX_ITEMS) {
      const chunk = imageUrls.slice(i, i + MEDIA_GALLERY_MAX_ITEMS);
      container.addMediaGalleryComponents((mediaGallery) =>
        mediaGallery.addItems(...chunk.map((url) => ({ media: { url } })))
      );
    }
  }

  if (hasBody) {
    container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(body));
  }

  container.addActionRowComponents((actionRow) =>
    actionRow.addComponents(
      new ButtonBuilder()
        .setCustomId(createComponentId('events', 'catalog', String(catalogPage)))
        .setLabel('Back')
        .setStyle(ButtonStyle.Secondary)
    )
  );

  return container;
}

/**
 * @param {{ status: number, msg?: string } | null} enriched
 * @returns {string | null} Error message if failed, null if success
 */
function getEnrichedError(enriched) {
  if (!enriched || enriched.status !== 0) {
    return enriched?.msg ?? 'Failed to load events';
  }
  return null;
}

export default {
  data: new SlashCommandBuilder()
    .setName('events')
    .setDescription('Browse in-game news and events')
    .addStringOption((option) =>
      option
        .setName('name')
        .setDescription('Jump to a specific event')
        .setAutocomplete(true)
        .setRequired(false)
    )
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),

  /** @param {import("discord.js").AutocompleteInteraction} interaction */
  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    const events = await getCachedEnrichedEvents();

    if (!events || events.status !== 0) {
      await interaction.respond([{ name: 'Failed to load events', value: '-999' }]);
      return;
    }

    const search = focusedOption.value.toLowerCase();

    const filtered = events.data
      .filter((e) => {
        const header = e.header;
        return header && header.toLowerCase().includes(search);
      })
      .slice(0, 25);

    await interaction.respond(filtered.map((e) => ({ name: e.header, value: e.cid })));
  },

  /** @param {import("discord.js").ChatInputCommandInteraction} interaction */
  async execute(interaction) {
    const eventCid = interaction.options.getString('name');
    await interaction.deferReply();

    const enriched = await getCachedEnrichedEvents();
    if (!enriched || enriched.status !== 0) {
      await interaction.editReply({
        components: [errorContainer(getEnrichedError(enriched) ?? 'Failed to load events')],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    const list = enriched.data;
    const byCid = enriched.byCid;

    if (BotConfig.environment === 'production') {
      await DbEvents.create(interaction.user.id, {
        source: 'slash',
        action: 'events',
      });
    }

    if (eventCid) {
      if (eventCid === '-999') {
        await interaction.editReply({
          components: [errorContainer('Invalid selection.')],
          flags: [MessageFlags.IsComponentsV2],
        });
        return;
      }
      const ev = byCid[eventCid];
      if (!ev) {
        await interaction.editReply({
          components: [errorContainer('Event not found.')],
          flags: [MessageFlags.IsComponentsV2],
        });
        return;
      }
      const idx = list.findIndex((e) => e.cid === eventCid);
      const catalogPage = idx >= 0 ? Math.floor(idx / EVENTS_PER_PAGE) : 0;
      await interaction.editReply({
        components: [buildEventDetailContainer(ev, catalogPage)],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    await interaction.editReply({
      components: [buildCatalogContainer(list, 0)],
      flags: [MessageFlags.IsComponentsV2],
    });
  },
  interactions: {
    button: eventButtonInteractions,
  },
};

/**
 * @param {import("discord.js").ButtonInteraction} interaction
 * @param {string} [pageStr]
 */
async function showEventsCatalog(interaction, pageStr) {
  await interaction.deferUpdate();

  const enriched = await getCachedEnrichedEvents();
  if (!enriched || enriched.status !== 0) {
    await interaction.editReply({
      components: [errorContainer(getEnrichedError(enriched) ?? 'Failed to load events')],
      flags: [MessageFlags.IsComponentsV2],
    });
    return;
  }

  const page = Math.max(0, parseInt(pageStr ?? '0', 10) || 0);
  await interaction.editReply({
    components: [buildCatalogContainer(enriched.data, page)],
    flags: [MessageFlags.IsComponentsV2],
  });
}

/**
 * @param {import("discord.js").ButtonInteraction} interaction
 * @param {string} cid
 * @param {string} [catalogPageStr]
 */
async function showEventDetail(interaction, cid, catalogPageStr) {
  await interaction.deferUpdate();

  const enriched = await getCachedEnrichedEvents();
  if (!enriched || enriched.status !== 0) {
    await interaction.editReply({
      components: [errorContainer(getEnrichedError(enriched) ?? 'Failed to load events')],
      flags: [MessageFlags.IsComponentsV2],
    });
    return;
  }

  const catalogPage = Math.max(0, parseInt(catalogPageStr ?? '0', 10) || 0);
  const ev = enriched.byCid[cid];
  await interaction.editReply({
    components: ev
      ? [buildEventDetailContainer(ev, catalogPage)]
      : [errorContainer('Event no longer available.')],
    flags: [MessageFlags.IsComponentsV2],
  });
}
