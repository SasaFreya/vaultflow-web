const SESSION_UNLOCK_KEY = 'vaultflow_session_unlock';

export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`vaultflow:${pin}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  const inputHash = await hashPin(pin);
  return inputHash === hash;
}

export function isSessionUnlocked(): boolean {
  return sessionStorage.getItem(SESSION_UNLOCK_KEY) === '1';
}

export function setSessionUnlocked(unlocked: boolean): void {
  if (unlocked) sessionStorage.setItem(SESSION_UNLOCK_KEY, '1');
  else sessionStorage.removeItem(SESSION_UNLOCK_KEY);
}

export function validatePinFormat(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}
