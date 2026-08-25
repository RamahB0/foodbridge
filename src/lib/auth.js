// Password hashing helpers. Kept isolated from routes so the hashing strategy
// (currently bcryptjs, a pure-JS implementation chosen to avoid native
// compilation during cloud builds) can change in one place.
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(plainTextPassword) {
  return bcrypt.hash(plainTextPassword, SALT_ROUNDS);
}

export async function verifyPassword(plainTextPassword, passwordHash) {
  return bcrypt.compare(plainTextPassword, passwordHash);
}

/** Very small, dependency-free email format check for registration/login forms. */
export function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
