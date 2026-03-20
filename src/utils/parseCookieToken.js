/**
 * Parse a cookie string from SKPort and extract ACCOUNT_TOKEN, SK_OAUTH_CRED_KEY, and hgId from HG_INFO_KEY.
 * @param {string} cookieString - Raw cookie string (e.g. ACCOUNT_TOKEN=...; SK_OAUTH_CRED_KEY=...; HG_INFO_KEY=...)
 */
export const parseCookieToken = (cookieString) => {
  const decoded = decodeURIComponent(cookieString.trim());
  const pairs = decoded.split(/\s*;\s*/);

  /** @type {Record<string, string>} */
  const parsed = {};
  for (const pair of pairs) {
    const eqIndex = pair.indexOf('=');
    if (eqIndex === -1) continue;
    const key = pair.slice(0, eqIndex).trim();
    const value = pair.slice(eqIndex + 1).trim();
    parsed[key] = value;
  }

  const token = parsed.ACCOUNT_TOKEN;
  const credKey = parsed.SK_OAUTH_CRED_KEY;
  const hgInfoKey = parsed.HG_INFO_KEY;

  if (!token || !credKey || !hgInfoKey) {
    return null;
  }

  let hgId;
  try {
    const hgInfo = JSON.parse(hgInfoKey);
    if (typeof hgInfo?.hgId !== 'string') return null;
    hgId = hgInfo.hgId;
  } catch {
    return null;
  }

  return { token, credKey, hgId };
};
