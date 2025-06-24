/**
 * End-to-End Encryption utilities using Web Crypto API
 * 
 * This module handles:
 * - RSA key pair generation for each user
 * - Message encryption using recipient's public key
 * - Message decryption using user's private key
 * - Key serialization for storage and transmission
 */

export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface SerializedKeyPair {
  publicKey: string;
  privateKey: string;
}

/**
 * Generate RSA key pair for encryption
 */
export async function generateKeyPair(): Promise<KeyPair> {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );

  return keyPair as KeyPair;
}

/**
 * Export key pair to base64 strings for storage
 */
export async function serializeKeyPair(keyPair: KeyPair): Promise<SerializedKeyPair> {
  const publicKeyBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
  const privateKeyBuffer = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

  const publicKey = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(publicKeyBuffer))));
  const privateKey = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(privateKeyBuffer))));

  return { publicKey, privateKey };
}

/**
 * Import public key from base64 string
 */
export async function importPublicKey(publicKeyString: string): Promise<CryptoKey> {
  const publicKeyBuffer = Uint8Array.from(atob(publicKeyString), c => c.charCodeAt(0));
  
  return await window.crypto.subtle.importKey(
    'spki',
    publicKeyBuffer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    false,
    ['encrypt']
  );
}

/**
 * Import private key from base64 string
 */
export async function importPrivateKey(privateKeyString: string): Promise<CryptoKey> {
  const privateKeyBuffer = Uint8Array.from(atob(privateKeyString), c => c.charCodeAt(0));
  
  return await window.crypto.subtle.importKey(
    'pkcs8',
    privateKeyBuffer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    false,
    ['decrypt']
  );
}

/**
 * Encrypt message using recipient's public key
 */
export async function encryptMessage(message: string, publicKey: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'RSA-OAEP',
    },
    publicKey,
    data
  );
  
  return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(encrypted))));
}

/**
 * Decrypt message using user's private key
 */
export async function decryptMessage(encryptedMessage: string, privateKey: CryptoKey): Promise<string> {
  const encryptedBuffer = Uint8Array.from(atob(encryptedMessage), c => c.charCodeAt(0));
  
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: 'RSA-OAEP',
    },
    privateKey,
    encryptedBuffer
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Store key pair in localStorage
 */
export function storeKeyPair(username: string, keyPair: SerializedKeyPair): void {
  localStorage.setItem(`keyPair_${username}`, JSON.stringify(keyPair));
}

/**
 * Retrieve key pair from localStorage
 */
export function getStoredKeyPair(username: string): SerializedKeyPair | null {
  const stored = localStorage.getItem(`keyPair_${username}`);
  return stored ? JSON.parse(stored) : null;
}

/**
 * Generate or retrieve existing key pair for user
 */
export async function getOrCreateKeyPair(username: string): Promise<{
  keyPair: KeyPair;
  serialized: SerializedKeyPair;
}> {
  let serialized = getStoredKeyPair(username);
  
  if (!serialized) {
    const keyPair = await generateKeyPair();
    serialized = await serializeKeyPair(keyPair);
    storeKeyPair(username, serialized);
    return { keyPair, serialized };
  }
  
  const publicKey = await importPublicKey(serialized.publicKey);
  const privateKey = await importPrivateKey(serialized.privateKey);
  
  return { 
    keyPair: { publicKey, privateKey }, 
    serialized 
  };
}