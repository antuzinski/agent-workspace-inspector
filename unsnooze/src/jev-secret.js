// Jev API-key storage. On Windows the on-disk value is encrypted with DPAPI
// CurrentUser, so copying jev.dpapi to another account or machine is useless.
// The plaintext is sent to PowerShell over stdin and never appears in argv,
// the environment, config.json, state.json, or logs.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { STATE_DIR, writePrivateFile } from './config.js';

const SECRET_DIR = join(STATE_DIR, 'secrets');
export const JEV_SECRET_FILE = join(SECRET_DIR, 'jev.dpapi');

const PROTECT_SCRIPT = [
  "$ErrorActionPreference='Stop'",
  'Add-Type -AssemblyName System.Security',
  '$plain=[Console]::In.ReadToEnd()',
  '$bytes=[Text.Encoding]::UTF8.GetBytes($plain)',
  '$cipher=[Security.Cryptography.ProtectedData]::Protect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)',
  '[Console]::Out.Write([Convert]::ToBase64String($cipher))',
].join(';');

const UNPROTECT_SCRIPT = [
  "$ErrorActionPreference='Stop'",
  'Add-Type -AssemblyName System.Security',
  '$encoded=[Console]::In.ReadToEnd().Trim()',
  '$cipher=[Convert]::FromBase64String($encoded)',
  '$bytes=[Security.Cryptography.ProtectedData]::Unprotect($cipher,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)',
  '[Console]::Out.Write([Text.Encoding]::UTF8.GetString($bytes))',
].join(';');

function defaultPowerShellRun(script, input) {
  let lastError;
  for (const executable of ['pwsh', 'powershell.exe']) {
    try {
      return execFileSync(executable, ['-NoProfile', '-NonInteractive', '-Command', script], {
        encoding: 'utf8', input, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (error) {
      lastError = error;
      if (error?.code !== 'ENOENT') break;
    }
  }
  throw lastError || new Error('PowerShell is unavailable');
}

function requireWindows(platform) {
  if (platform !== 'win32') {
    throw new Error('secure Jev key storage is currently available on Windows; use TYPESAFE_API_KEY on this platform');
  }
}

export function storeJevApiKey(secret, {
  platform = process.platform,
  run = defaultPowerShellRun,
  target = JEV_SECRET_FILE,
} = {}) {
  requireWindows(platform);
  const value = String(secret ?? '').replace(/[\r\n]+$/, '');
  if (!value) throw new Error('Jev API key cannot be empty');
  const encoded = String(run(PROTECT_SCRIPT, value) ?? '').trim();
  if (!encoded) throw new Error('Windows did not return an encrypted Jev key');
  mkdirSync(join(target, '..'), { recursive: true, mode: 0o700 });
  writePrivateFile(target, `${target}.tmp.${process.pid}`, `${encoded}\n`);
  return target;
}

export function loadStoredJevApiKey({
  platform = process.platform,
  run = defaultPowerShellRun,
  target = JEV_SECRET_FILE,
} = {}) {
  requireWindows(platform);
  if (!existsSync(target)) return null;
  const encoded = readFileSync(target, 'utf8').trim();
  if (!encoded) return null;
  const secret = String(run(UNPROTECT_SCRIPT, encoded) ?? '').replace(/[\r\n]+$/, '');
  if (!secret) throw new Error('stored Jev API key could not be decrypted');
  return secret;
}

export function resolveJevApiKey(options = {}) {
  const fromEnvironment = process.env.TYPESAFE_API_KEY;
  if (fromEnvironment) return fromEnvironment;
  return loadStoredJevApiKey(options);
}

export function jevApiKeyStatus({
  platform = process.platform,
  target = JEV_SECRET_FILE,
} = {}) {
  if (process.env.TYPESAFE_API_KEY) return { configured: true, source: 'environment' };
  if (platform === 'win32' && existsSync(target)) return { configured: true, source: 'windows-dpapi' };
  return { configured: false, source: null };
}

export function removeStoredJevApiKey({ target = JEV_SECRET_FILE } = {}) {
  if (!existsSync(target)) return false;
  unlinkSync(target);
  return true;
}
