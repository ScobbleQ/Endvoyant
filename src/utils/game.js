/**
 * @param {number} evolvePhase
 */
export function getMaxLevel(evolvePhase) {
  switch (evolvePhase) {
    case 1:
      return 40;
    case 2:
      return 60;
    case 3:
      return 80;
    case 4:
      return 90;
    default:
      return 20;
  }
}

/**
 *
 * @param {number} breakthroughLevel
 */
export function getBreakthroughLevel(breakthroughLevel) {
  switch (breakthroughLevel) {
    case 1:
      return 40;
    case 2:
      return 60;
    case 3:
      return 80;
    case 4:
      return 90;
    default:
      return 20;
  }
}
