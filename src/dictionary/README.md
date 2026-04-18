# Dictionary (i18n)

User-facing strings live in `locales/*.json` (one file per language code). The loader and `t()` helper are in `index.js`.

## Translation disclaimer

**`en-us` is the reference locale.** Strings in **all other languages** were produced with **AI-assisted translation** (large language models) as a starting point. They are **not** reviewed by default for naturalness, regional usage, or in-game terminology unless a contributor has updated them.

These files are provided **as-is** and are **not** official copy from the game or its publishers. Wording, tone, and terminology may differ between locales; some strings may be incomplete, outdated, or wrong. **Do not rely on them for legal, commercial, or safety-critical meaning.** If something reads off in your language, corrections are very welcome.

## Contributing

Improvements and new locale strings are welcome. The easiest way to coordinate is to join the **Endvoyant Discord server**: [https://discord.gg/5rUsSZTyf2](https://discord.gg/5rUsSZTyf2). From there you can ask where to submit changes (for example a pull request with updates under `locales/`), report awkward phrasing, or help review translations.

When you add or change keys, keep placeholder names consistent across all locale files (for example `{{count}}` in `attendance.amount`) so the same `t('some.key', lang, { count: 5 })` call works everywhere.
