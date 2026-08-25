// Turns a free-text address into approximate coordinates using OpenStreetMap's
// public Nominatim search API. No API key is required, which matters for this
// project's one-click-deploy goal: a user following the README should not have
// to sign up for a geocoding provider just to get the app running.
//
// Nominatim's usage policy caps unauthenticated traffic at ~1 request/second,
// which is well within range for this app's expected volume (an org creating
// or editing a listing). If FoodBridge ever needed higher volume, this module
// is the single place to swap in a paid provider.

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

/**
 * Resolves a free-text address to { lat, lng }. Returns null if no match was
 * found or the lookup failed, so callers can fall back to asking the user to
 * refine the address rather than crashing the request.
 */
export async function geocodeAddress(address) {
  if (!address || typeof address !== 'string' || !address.trim()) {
    return null;
  }

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set('q', address);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');

  try {
    const response = await fetch(url, {
      headers: {
        // Nominatim's usage policy requires a descriptive User-Agent.
        'User-Agent': 'FoodBridge/1.0 (surplus food donation matching app)',
      },
    });

    if (!response.ok) {
      return null;
    }

    const results = await response.json();
    if (!Array.isArray(results) || results.length === 0) {
      return null;
    }

    const { lat, lon } = results[0];
    const parsedLat = Number.parseFloat(lat);
    const parsedLng = Number.parseFloat(lon);

    if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
      return null;
    }

    return { lat: parsedLat, lng: parsedLng };
  } catch {
    return null;
  }
}
