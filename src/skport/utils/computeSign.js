import crypto from 'crypto';

/**
 * Compute the signature for zonai.skport.com API requests.
 *
 * Formula: sign = MD5(HMAC-SHA256(path + body + timestamp + headers_json, signToken))
 * @param {{ token: string, path: string, body: string, timestamp: string }} param0
 * @example
 * // Login with email and password
 * const login = await tokenByEmailPassword('test@example.com', 'password');
 * const oauth = await grantOAuth({ token: login.data.token, appCode: '6eb76d4e13aa36e6' });
 *
 * // Exchange the OAuth token for credentials
 * const cred = await generateCredByCode({ code: oauth.data.code });
 *
 * // Compute the signature
 * const sign = computeSign({
 *   token: cred.data.token,
 *   path: '/web/v1/game/endfield/attendance',
 *   body: '{}'
 * });
 */
export function computeSign({ token, path, body = '', timestamp }) {
  const headers = JSON.stringify({
    platform: '3',
    timestamp: timestamp,
    dId: '', // Device ID, can be left empty
    vName: '1.0.0',
  });

  const signString = `${path}${body}${timestamp}${headers}`;
  const hmac = crypto.createHmac('sha256', token).update(signString).digest('hex');
  return crypto.createHash('md5').update(hmac).digest('hex');
}
