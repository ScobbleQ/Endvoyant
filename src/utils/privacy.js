/**
 *
 * @param {string} uid
 * @param {boolean} flag
 */
export function privacy(uid, flag) {
  if (!flag) return uid;

  const firstPart = uid.slice(0, 1);
  const lastPart = uid.slice(-4);
  const middlePart = uid.replace(/[0-9]/g, '*');

  return firstPart + middlePart + lastPart;
}
