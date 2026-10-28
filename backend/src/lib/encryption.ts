import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const DEFAULT_FALLBACK_SECRET = 'engida-finance-aes-256-gcm-master-key-change-in-prod';

/**
 * Derives a 32-byte key from the configured secret.
 */
function getKey(customKey?: string): Buffer {
  const secret = customKey || process.env.FINANCE_ENCRYPTION_KEY || DEFAULT_FALLBACK_SECRET;
  return createHash('sha256').update(secret).digest();
}

/**
 * Encrypts a string using AES-256-GCM.
 * Output format: `iv.authTag.ciphertext` (hex encoded).
 */
export function encryptField(plainText: string | null | undefined, customKey?: string): string | null {
  if (!plainText) return null;

  const key = getKey(customKey);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}.${authTag}.${encrypted}`;
}

/**
 * Decrypts a string encrypted with `encryptField`.
 */
export function decryptField(encryptedText: string | null | undefined, customKey?: string): string | null {
  if (!encryptedText) return null;

  try {
    const parts = encryptedText.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted format; expected iv.authTag.ciphertext');
    }

    const [ivHex, authTagHex, cipherHex] = parts;
    const key = getKey(customKey);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err: any) {
    throw new Error(`Failed to decrypt field: ${err.message}`);
  }
}

/**
 * Returns the last 4 characters of a string (digits or characters), or null if empty.
 */
export function extractLast4(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.trim();
  if (cleaned.length <= 4) return cleaned;
  return cleaned.slice(-4);
}
