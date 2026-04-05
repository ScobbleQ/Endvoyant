/** @typedef {"zh_Hans"|"zh_Hant"|"de_DE"|"en"|"es_MX"|"fr_FR"|"id_ID"|"it_IT"|"ja"|"ko"|"pt_BR"|"ru_RU"|"th_TH"|"vi_VN"} WebLanguage */

export const webLanguage = {
  zh_Hans: 'zh-CN',
  zh_Hant: 'zh-TW',
  de_DE: 'de-DE',
  en: 'en-US',
  es_MX: 'es-MX',
  fr_FR: 'fr-FR',
  id_ID: 'id-ID',
  it_IT: 'it-IT',
  ja: 'ja-JP',
  ko: 'ko-KR',
  pt_BR: 'pt-BR',
  ru_RU: 'ru-RU',
  th_TH: 'th-TH',
  vi_VN: 'vi-VN',
};

/** @type {Record<import('#/constants/languages.js').Language, WebLanguage>} */
export const langToWeb = {
  'zh-cn': 'zh_Hans',
  'zh-tw': 'zh_Hant',
  'de-de': 'de_DE',
  'en-us': 'en',
  'es-mx': 'es_MX',
  'fr-fr': 'fr_FR',
  'id-id': 'id_ID',
  'it-it': 'it_IT',
  'ja-jp': 'ja',
  'ko-kr': 'ko',
  'pt-br': 'pt_BR',
  'ru-ru': 'ru_RU',
  'th-th': 'th_TH',
  'vi-vn': 'vi_VN',
};
