import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export function splitCredentials(value) {
  if (Array.isArray(value)) return value.map(item => String(item || '').trim()).filter(Boolean);
  const credential = String(value || '').trim();
  return credential ? [credential] : [];
}

function encryptionKey() {
  if (!process.env.SERVER_CREDENTIAL_ENCRYPTION_KEY) throw new Error('SERVER_CREDENTIAL_ENCRYPTION_KEY is not configured');
  return createHash('sha256').update(process.env.SERVER_CREDENTIAL_ENCRYPTION_KEY).digest();
}

export function encryptCredential(value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `v1:${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptCredential(value) {
  const [version, ivHex, tagHex, encryptedHex] = String(value || '').split(':');
  if (version !== 'v1' || !ivHex || !tagHex || !encryptedHex) throw new Error('Stored credential format is invalid');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedHex, 'hex')), decipher.final()]).toString('utf8');
}
