/**
 * Sleep for a given number of milliseconds
 * @param {number} ms - The number of milliseconds to sleep
 */
export async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
