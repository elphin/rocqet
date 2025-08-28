/**
 * Crypto utilities for encrypting/decrypting sensitive data
 * Uses Web Crypto API for browser-compatible encryption
 */

// Get encryption key from environment or generate one
const getEncryptionKey = async (): Promise<CryptoKey> => {
  // In production, this should come from a secure environment variable
  const keyString = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'ROCQET-2024-SECURE-KEY-CHANGE-THIS';
  
  // Convert string to ArrayBuffer
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyString.padEnd(32, '0').slice(0, 32));
  
  // Import as crypto key
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
};

/**
 * Encrypt a string using AES-GCM
 */
export async function encrypt(text: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt the data
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      data
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);
    
    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt a string encrypted with encrypt()
 */
export async function decrypt(encryptedText: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    
    // Convert from base64
    const combined = Uint8Array.from(atob(encryptedText), c => c.charCodeAt(0));
    
    // Extract IV and data
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);
    
    // Decrypt the data
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encryptedData
    );
    
    // Convert back to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Create a masked version of an API key for display
 */
export function maskApiKey(key: string, provider: string): string {
  if (!key || key.length < 8) return '***';
  
  const prefix = provider.toUpperCase().slice(0, 3);
  const suffix = key.slice(-4);
  
  return `${prefix}-****-${suffix}`;
}