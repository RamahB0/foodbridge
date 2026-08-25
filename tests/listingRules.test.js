import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canTransitionListing,
  canTransitionClaim,
  isPastExpiry,
  canEditListing,
  canClaimListing,
} from '../src/lib/listingRules.js';

test('AVAILABLE listing can move to CLAIMED, CANCELLED, or EXPIRED', () => {
  assert.equal(canTransitionListing('AVAILABLE', 'CLAIMED'), true);
  assert.equal(canTransitionListing('AVAILABLE', 'CANCELLED'), true);
  assert.equal(canTransitionListing('AVAILABLE', 'EXPIRED'), true);
});

test('AVAILABLE listing cannot move directly to PICKED_UP', () => {
  assert.equal(canTransitionListing('AVAILABLE', 'PICKED_UP'), false);
});

test('CLAIMED listing can move to PICKED_UP or CANCELLED', () => {
  assert.equal(canTransitionListing('CLAIMED', 'PICKED_UP'), true);
  assert.equal(canTransitionListing('CLAIMED', 'CANCELLED'), true);
});

test('terminal listing states have no valid transitions', () => {
  for (const terminal of ['PICKED_UP', 'CANCELLED', 'EXPIRED']) {
    for (const target of ['AVAILABLE', 'CLAIMED', 'PICKED_UP', 'CANCELLED', 'EXPIRED']) {
      assert.equal(canTransitionListing(terminal, target), false);
    }
  }
});

test('unknown listing status throws', () => {
  assert.throws(() => canTransitionListing('BOGUS', 'CLAIMED'), RangeError);
  assert.throws(() => canTransitionListing('AVAILABLE', 'BOGUS'), RangeError);
});

test('PENDING claim can move to CONFIRMED or CANCELLED', () => {
  assert.equal(canTransitionClaim('PENDING', 'CONFIRMED'), true);
  assert.equal(canTransitionClaim('PENDING', 'CANCELLED'), true);
});

test('CONFIRMED claim can move to COMPLETED or CANCELLED', () => {
  assert.equal(canTransitionClaim('CONFIRMED', 'COMPLETED'), true);
  assert.equal(canTransitionClaim('CONFIRMED', 'CANCELLED'), true);
});

test('COMPLETED and CANCELLED claims are terminal', () => {
  assert.equal(canTransitionClaim('COMPLETED', 'PENDING'), false);
  assert.equal(canTransitionClaim('CANCELLED', 'PENDING'), false);
});

test('unknown claim status throws', () => {
  assert.throws(() => canTransitionClaim('BOGUS', 'PENDING'), RangeError);
});

test('isPastExpiry is true only for an AVAILABLE listing whose window has passed', () => {
  const now = new Date('2026-08-25T12:00:00Z');
  const expired = { status: 'AVAILABLE', expiresAt: '2026-08-25T11:00:00Z' };
  const future = { status: 'AVAILABLE', expiresAt: '2026-08-25T13:00:00Z' };
  const claimedButOld = { status: 'CLAIMED', expiresAt: '2026-08-25T11:00:00Z' };

  assert.equal(isPastExpiry(expired, now), true);
  assert.equal(isPastExpiry(future, now), false);
  assert.equal(isPastExpiry(claimedButOld, now), false);
});

test('canEditListing only allows the owning donor', () => {
  const listing = { donorId: 'donor-1' };
  assert.equal(canEditListing(listing, 'donor-1'), true);
  assert.equal(canEditListing(listing, 'donor-2'), false);
});

test('canClaimListing requires AVAILABLE status and a different org than the donor', () => {
  const listing = { status: 'AVAILABLE', donorId: 'donor-1' };
  assert.equal(canClaimListing(listing, 'recipient-1'), true);
  assert.equal(canClaimListing(listing, 'donor-1'), false);
  assert.equal(canClaimListing({ ...listing, status: 'CLAIMED' }, 'recipient-1'), false);
});
