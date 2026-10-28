import assert from 'node:assert/strict';
import { pbkdf2Sync } from 'node:crypto';
import test from 'node:test';
import { verifyFilmEditPassword } from './filmEditPassword.js';

// A disposable fixture; the deployed password is never part of the test source.
const password = 'temporary-test-pass';
const saltHex = '0123456789abcdef0123456789abcdef';
const verifier = {
  iterations: 1000,
  saltHex,
  hashHex: pbkdf2Sync(password, Buffer.from(saltHex, 'hex'), 1000, 32, 'sha256').toString('hex'),
};

test('accepts the configured password', async () => {
  assert.equal(await verifyFilmEditPassword(password, verifier), true);
});

test('rejects a wrong password and treats case and whitespace as significant', async () => {
  for (const value of ['wrong-password', password.toUpperCase(), ` ${password}`, `${password} `]) {
    assert.equal(await verifyFilmEditPassword(value, verifier), false);
  }
});

test('rejects empty and non-string passwords', async () => {
  for (const value of ['', null, undefined, 123]) {
    assert.equal(await verifyFilmEditPassword(value, verifier), false);
  }
});

test('fails closed with an absent or malformed verifier', async () => {
  for (const value of [null, {}, { ...verifier, saltHex: '' }, { ...verifier, hashHex: 'invalid' }, { ...verifier, iterations: 0 }, { ...verifier, iterations: 2000001 }]) {
    assert.equal(await verifyFilmEditPassword(password, value), false);
  }
});
