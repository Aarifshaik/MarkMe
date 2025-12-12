/**
 * Utility script to generate SHA-256 hashes for user passwords
 * Run this script to generate proper hashes for the hardcoded users
 */

const crypto = require('crypto');

function generateHash(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Generate hashes for all users
const passwords = {
  // Vijayawada users
  'vja_user1': 'vijayawada1',
  'vja_user2': 'vijayawada2',
  'vja_user3': 'vijayawada3',
  'vja_user4': 'vijayawada4',
  
  // Nellore users
  'nel_user1': 'nellore1',
  'nel_user2': 'nellore2',
  'nel_user3': 'nellore3',
  'nel_user4': 'nellore4',
  
  // Visakhapatnam users
  'vsk_user1': 'visakhapatnam1',
  'vsk_user2': 'visakhapatnam2',
  'vsk_user3': 'visakhapatnam3',
  'vsk_user4': 'visakhapatnam4',
  
  // Admin user
  'admin': 'admin123'
};

console.log('Generated SHA-256 hashes:');
console.log('========================');

for (const [username, password] of Object.entries(passwords)) {
  const hash = generateHash(password);
  console.log(`${username}: ${hash} // ${password}`);
}