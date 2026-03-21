import {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import { errorContainer } from '#/components/index.js';
import { Events as DbEvents, Users } from '#/db/index.js';
import { getCachedEnrichedEvents } from '#/skport/utils/getCachedEvents.js';
import { createComponentId } from '#/utils/componentId.js';
import { BotConfig } from '#/config';

/** @typedef {import('#/types/skport/game.js').CachedBulletinEvent} CachedBulletinEvent */
/** @typedef {CachedBulletinEvent['tab']} EventTab */

const EVENTS_PER_PAGE = 5;
const MAX_BODY_LENGTH = 3800;
const MEDIA_GALLERY_MAX_ITEMS = 10;
const EVENT_TABS = /** @type {const} */ (['all', 'events', 'updates', 'news']);
const INITIAL_STATE = {
  page: 0,
  tab: 'all',
};

const eventButtonInteractions = {
  catalog: showEventsCatalog,
  page: showEventsCatalog,
  tab: filterEventsByTab,
  view: showEventDetail,
};

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
    const { lang } = await getUserContext(interaction.user.id);
    const events = await getCachedEnrichedEvents(lang);

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

    const { lang, user } = await getUserContext(interaction.user.id);
    const enriched = await getCachedEnrichedEvents(lang);
    if (!enriched || enriched.status !== 0) {
      await interaction.editReply({
        components: [errorContainer(getEnrichedError(enriched) ?? 'Failed to load events')],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    const list = enriched.data;
    const byCid = enriched.byCid;

    if (user && BotConfig.environment === 'production') {
      await DbEvents.create(user.dcid, {
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
        components: [
          buildEventDetailContainer(ev, toCatalogStateStr({ page: catalogPage, tab: 'all' })),
        ],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    await interaction.editReply({
      components: [buildCatalogContainer(list, INITIAL_STATE)],
      flags: [MessageFlags.IsComponentsV2],
    });
  },
  interactions: {
    button: eventButtonInteractions,
  },
};

/**
 * @param {import("discord.js").ButtonInteraction} interaction
 * @param {string} [stateStr]
 */
async function showEventsCatalog(interaction, stateStr) {
  await interaction.deferUpdate();

  const { lang } = await getUserContext(interaction.user.id);
  const enriched = await getCachedEnrichedEvents(lang);
  if (!enriched || enriched.status !== 0) {
    await interaction.editReply({
      components: [errorContainer(getEnrichedError(enriched) ?? 'Failed to load events')],
      flags: [MessageFlags.IsComponentsV2],
    });
    return;
  }

  const state = stateStr ? parseCatalogState(stateStr) : INITIAL_STATE;
  await interaction.editReply({
    components: [buildCatalogContainer(enriched.data, state)],
    flags: [MessageFlags.IsComponentsV2],
  });
}

/**
 * @param {import("discord.js").ButtonInteraction} interaction
 * @param {string} tab
 * @param {string} [stateStr]
 */
async function filterEventsByTab(interaction, tab, stateStr) {
  await interaction.deferUpdate();

  const { lang } = await getUserContext(interaction.user.id);
  const enriched = await getCachedEnrichedEvents(lang);
  if (!enriched || enriched.status !== 0) {
    await interaction.editReply({
      components: [errorContainer(getEnrichedError(enriched) ?? 'Failed to load events')],
      flags: [MessageFlags.IsComponentsV2],
    });
    return;
  }

  const baseState = stateStr ? parseCatalogState(stateStr) : INITIAL_STATE;
  const nextTab = isEventTab(tab) ? tab : 'all';
  await interaction.editReply({
    components: [
      buildCatalogContainer(enriched.data, {
        ...baseState,
        page: 0,
        tab: nextTab,
      }),
    ],
    flags: [MessageFlags.IsComponentsV2],
  });
}

/**
 * @param {import("discord.js").ButtonInteraction} interaction
 * @param {string} cid
 * @param {string} [catalogStateStr]
 */
async function showEventDetail(interaction, cid, catalogStateStr) {
  await interaction.deferUpdate();

  const { lang } = await getUserContext(interaction.user.id);
  const enriched = await getCachedEnrichedEvents(lang);
  if (!enriched || enriched.status !== 0) {
    await interaction.editReply({
      components: [errorContainer(getEnrichedError(enriched) ?? 'Failed to load events')],
      flags: [MessageFlags.IsComponentsV2],
    });
    return;
  }

  const catalogState = catalogStateStr ? parseCatalogState(catalogStateStr) : INITIAL_STATE;
  const ev = enriched.byCid[cid];
  await interaction.editReply({
    components: ev
      ? [buildEventDetailContainer(ev, toCatalogStateStr(catalogState))]
      : [errorContainer('Event no longer available.')],
    flags: [MessageFlags.IsComponentsV2],
  });
}

/** @param {{ page: number, tab: string }} state */
function toCatalogStateStr(state) {
  return `${Math.max(0, state.page)}:${isEventTab(state.tab) ? state.tab : 'all'}`;
}

/** @param {string} stateStr */
function parseCatalogState(stateStr) {
  const [pageStr = '0', tab = 'all'] = stateStr.split(':');
  return {
    page: Math.max(0, parseInt(pageStr, 10) || 0),
    tab: isEventTab(tab) ? tab : 'all',
  };
}

/** @param {string} tab */
function isEventTab(tab) {
  return EVENT_TABS.includes(/** @type {(typeof EVENT_TABS)[number]} */ (tab));
}

/**
 * @param {CachedBulletinEvent} ev
 * @param {string} tab
 */
function matchesEventTab(ev, tab) {
  if (tab === 'all') return true;
  return ev.tab === tab;
}

/** @param {string} tab */
function getEventTabLabel(tab) {
  switch (tab) {
    case 'events':
      return 'Events';
    case 'updates':
      return 'Updates';
    case 'news':
      return 'News';
    default:
      return 'All';
  }
}

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
 * @param {{ page: number, tab: string }} state
 */
function buildCatalogContainer(list, { page, tab }) {
  const filtered = list.filter((ev) => matchesEventTab(ev, tab));
  const totalPages = Math.max(1, Math.ceil(filtered.length / EVENTS_PER_PAGE));
  const clampedPage = Math.min(Math.max(0, page), totalPages - 1);
  const slice = filtered.slice(clampedPage * EVENTS_PER_PAGE, (clampedPage + 1) * EVENTS_PER_PAGE);
  const stateStr = toCatalogStateStr({ page: clampedPage, tab });

  const container = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
    textDisplay.setContent('## ▼// Game events')
  );

  container.addActionRowComponents((actionRow) =>
    actionRow.addComponents(
      ...EVENT_TABS.map((value) =>
        new ButtonBuilder()
          .setCustomId(createComponentId('events', 'tab', value, stateStr))
          .setLabel(getEventTabLabel(value))
          .setStyle(tab === value ? ButtonStyle.Success : ButtonStyle.Secondary)
      )
    )
  );

  if (filtered.length === 0) {
    container.addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        tab === 'all'
          ? 'No events available right now.'
          : `No ${getEventTabLabel(tab).toLowerCase()} available right now.`
      )
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
            .setCustomId(createComponentId('events', 'view', ev.cid, stateStr))
            .setLabel('View event')
            .setStyle(ButtonStyle.Primary)
        )
    );
  }

  if (filtered.length > EVENTS_PER_PAGE) {
    const prevPage = Math.max(0, clampedPage - 1);
    const nextPage = Math.min(totalPages - 1, clampedPage + 1);

    container.addActionRowComponents((actionRow) =>
      actionRow.addComponents(
        new ButtonBuilder()
          .setCustomId(
            createComponentId('events', 'page', toCatalogStateStr({ page: prevPage, tab }))
          )
          .setLabel('Previous')
          .setStyle(clampedPage === 0 ? ButtonStyle.Secondary : ButtonStyle.Success)
          .setDisabled(clampedPage === 0),
        new ButtonBuilder()
          .setCustomId(createComponentId('events', 'page', 'display'))
          .setLabel(`${clampedPage + 1} / ${totalPages}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId(
            createComponentId('events', 'page', toCatalogStateStr({ page: nextPage, tab }))
          )
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
 * @param {string} catalogStateStr
 */
function buildEventDetailContainer(ev, catalogStateStr) {
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
        .setCustomId(createComponentId('events', 'catalog', catalogStateStr))
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

/**
 * @param {string} dcid
 */
async function getUserContext(dcid) {
  const user = await Users.getByDcid(dcid);
  return {
    lang: /** @type {import('#/constants/languages.js').Language} */ (user?.lang || 'en-us'),
    user,
  };
}
