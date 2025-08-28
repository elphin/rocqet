// Generate human-readable slugs for share links
const adjectives = [
  'happy', 'clever', 'bright', 'swift', 'gentle', 'bold', 'calm', 'eager',
  'fancy', 'jolly', 'kind', 'lively', 'merry', 'neat', 'proud', 'quick',
  'smart', 'witty', 'brave', 'cool', 'epic', 'fresh', 'grand', 'keen',
  'noble', 'prime', 'royal', 'sharp', 'super', 'vivid', 'warm', 'wise'
];

const nouns = [
  'dolphin', 'eagle', 'falcon', 'panda', 'tiger', 'wolf', 'bear', 'lion',
  'phoenix', 'dragon', 'griffin', 'wizard', 'knight', 'ninja', 'pirate',
  'rocket', 'comet', 'star', 'planet', 'galaxy', 'nebula', 'cosmos', 'orbit',
  'mountain', 'ocean', 'forest', 'desert', 'canyon', 'valley', 'river', 'lake',
  'thunder', 'lightning', 'storm', 'breeze', 'sunrise', 'sunset', 'rainbow'
];

export function generateReadableSlug(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 9999);
  
  return `${adjective}-${noun}-${number}`;
}

export function generateSecureSlug(): string {
  // More secure version with additional randomness
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const random = Math.random().toString(36).substring(2, 8);
  
  return `${adjective}-${noun}-${random}`;
}