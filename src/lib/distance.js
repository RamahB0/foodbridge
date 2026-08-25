// Great-circle distance between two lat/lng points using the haversine formula.
// Used to sort available listings by proximity to a recipient's registered address,
// and to power the "within N miles" filter on the browse page. Pure function, no
// dependencies, so it can be unit tested without a database.

const EARTH_RADIUS_MILES = 3958.8;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Returns the distance in miles between two coordinates.
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} distance in miles, rounded to 1 decimal place
 */
export function distanceInMiles(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some((n) => typeof n !== 'number' || Number.isNaN(n))) {
    throw new TypeError('distanceInMiles requires four finite numbers');
  }

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const miles = EARTH_RADIUS_MILES * c;

  return Math.round(miles * 10) / 10;
}

/**
 * Sorts a list of items (each with numeric lat/lng fields) by distance from an
 * origin point, ascending. Returns a new array; each item is spread with an
 * added `distanceMiles` field.
 */
export function sortByDistance(items, originLat, originLng) {
  return items
    .map((item) => ({
      ...item,
      distanceMiles: distanceInMiles(originLat, originLng, item.lat, item.lng),
    }))
    .sort((a, b) => a.distanceMiles - b.distanceMiles);
}
