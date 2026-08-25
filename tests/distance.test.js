import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distanceInMiles, sortByDistance } from '../src/lib/distance.js';

test('distance between identical points is 0', () => {
  assert.equal(distanceInMiles(40.7128, -74.006, 40.7128, -74.006), 0);
});

test('distance between New York and Los Angeles is roughly 2445 miles', () => {
  const miles = distanceInMiles(40.7128, -74.006, 34.0522, -118.2437);
  assert.ok(Math.abs(miles - 2445) < 15, `expected ~2445, got ${miles}`);
});

test('distance is symmetric', () => {
  const a = distanceInMiles(41.8781, -87.6298, 29.7604, -95.3698);
  const b = distanceInMiles(29.7604, -95.3698, 41.8781, -87.6298);
  assert.equal(a, b);
});

test('throws on non-numeric input', () => {
  assert.throws(() => distanceInMiles('a', -74.006, 40.7128, -74.006), TypeError);
});

test('throws on NaN input', () => {
  assert.throws(() => distanceInMiles(NaN, -74.006, 40.7128, -74.006), TypeError);
});

test('sortByDistance orders items nearest-first and attaches distanceMiles', () => {
  const origin = { lat: 40.7128, lng: -74.006 }; // New York
  const items = [
    { id: 'la', lat: 34.0522, lng: -118.2437 },
    { id: 'newark', lat: 40.7357, lng: -74.1724 },
    { id: 'chicago', lat: 41.8781, lng: -87.6298 },
  ];

  const sorted = sortByDistance(items, origin.lat, origin.lng);

  assert.deepEqual(
    sorted.map((i) => i.id),
    ['newark', 'chicago', 'la'],
  );
  assert.ok(sorted.every((i) => typeof i.distanceMiles === 'number'));
  assert.ok(sorted[0].distanceMiles < sorted[1].distanceMiles);
  assert.ok(sorted[1].distanceMiles < sorted[2].distanceMiles);
});

test('sortByDistance does not mutate the input array', () => {
  const items = [{ id: 'a', lat: 1, lng: 1 }];
  const result = sortByDistance(items, 0, 0);
  assert.notEqual(result[0], items[0]);
  assert.equal(items[0].distanceMiles, undefined);
});
