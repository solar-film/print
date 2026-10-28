import { filmEditAccess } from '../data/filmEditAccess.js';

export async function verifyFilmEditPassword(password, verifier = filmEditAccess) {
  if (typeof password !== 'string' || !password
    || !verifier || !Number.isSafeInteger(verifier.iterations)
    || verifier.iterations < 1 || verifier.iterations > 2000000
    || !/^[a-f0-9]{32}$/i.test(verifier.saltHex)
    || !/^[a-f0-9]{64}$/i.test(verifier.hashHex)) return false;

  const fromHex = (value) => Uint8Array.from(value.match(/.{2}/g), (pair) => Number.parseInt(pair, 16));
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'],
  );
  const derived = new Uint8Array(await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    hash: 'SHA-256',
    salt: fromHex(verifier.saltHex),
    iterations: verifier.iterations,
  }, key, 256));
  const expected = fromHex(verifier.hashHex);
  return derived.reduce((difference, byte, index) => difference | (byte ^ expected[index]), 0) === 0;
}
