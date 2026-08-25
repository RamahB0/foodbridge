// Business rules for the listing/claim lifecycle. Kept free of any database or
// framework dependency so the state machine can be unit tested directly.
//
// Listing lifecycle:  AVAILABLE -> CLAIMED -> PICKED_UP
//                      AVAILABLE -> CANCELLED
//                      AVAILABLE -> EXPIRED
//                      CLAIMED   -> CANCELLED   (claim fell through, listing reopens via CANCELLED then a new listing, or manual admin action)
//
// Claim lifecycle:    PENDING -> CONFIRMED -> COMPLETED
//                      PENDING -> CANCELLED
//                      CONFIRMED -> CANCELLED

export const LISTING_TRANSITIONS = {
  AVAILABLE: ['CLAIMED', 'CANCELLED', 'EXPIRED'],
  CLAIMED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: [],
  CANCELLED: [],
  EXPIRED: [],
};

export const CLAIM_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

function validateTransition(transitions, from, to) {
  if (!(from in transitions)) {
    throw new RangeError(`Unknown status "${from}"`);
  }
  if (!(to in transitions)) {
    throw new RangeError(`Unknown target status "${to}"`);
  }
  return transitions[from].includes(to);
}

/** Returns true if a listing may move from `from` to `to`. */
export function canTransitionListing(from, to) {
  return validateTransition(LISTING_TRANSITIONS, from, to);
}

/** Returns true if a claim may move from `from` to `to`. */
export function canTransitionClaim(from, to) {
  return validateTransition(CLAIM_TRANSITIONS, from, to);
}

/**
 * A listing is past its expiry window and should be treated as EXPIRED even if
 * no background job has flipped its status yet.
 */
export function isPastExpiry(listing, now = new Date()) {
  return listing.status === 'AVAILABLE' && new Date(listing.expiresAt) <= now;
}

/** Only the donor who owns a listing may edit or cancel it. */
export function canEditListing(listing, userId) {
  return listing.donorId === userId;
}

/** Only an AVAILABLE listing accepts new claims, and a donor cannot claim their own listing. */
export function canClaimListing(listing, recipientId) {
  return listing.status === 'AVAILABLE' && listing.donorId !== recipientId;
}
