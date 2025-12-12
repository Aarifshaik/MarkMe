/**
 * SHA-256 password hashing utility functions for authentication
 */

/**
 * Generates SHA-256 hash of a password string
 * @param password - Plain text password
 * @returns Promise<string> - SHA-256 hash in hexadecimal format
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Verifies a password against a stored hash
 * @param password - Plain text password to verify
 * @param storedHash - Stored SHA-256 hash to compare against
 * @returns Promise<boolean> - True if password matches hash
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === storedHash;
}

/**
 * Generates a SHA-256 hash for development/setup purposes
 * This function can be used to generate hashes for hardcoded users
 * @param password - Plain text password
 * @returns Promise<string> - SHA-256 hash
 */
export async function generateHashForPassword(password: string): Promise<string> {
  return await hashPassword(password);
}