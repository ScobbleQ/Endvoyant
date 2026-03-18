/**
 *
 * @param {{ token: string, uid: string }} param0
 * @returns
 * @example
 * // Login with email and password
 * const login = await tokenByEmailPassword('test@example.com', 'password');
 * const oauth = await grantOAuth({ token: login.data.token, appCode: '3dacefa138426cfe' });
 *
 * // Get the UID of the endfield binding
 * const bindings = await bindingList({ token: oauth.data.token });
 * const endfield = bindings.data.find((binding) => binding.appCode === 'endfield');
 *
 * // Pass OAuth token and UID to get U8 token
 * const u8Token = await u8TokenByUid({ token: oauth.data.token, uid: endfield.bindingList.uid });
 * console.dir(u8Token, { depth: null });
 */
export async function u8TokenByUid({ token, uid }) {
  const url = 'https://binding-api-account-prod.gryphline.com/account/binding/v1/u8_token_by_uid';
  console.log(token, uid, url);
}
