import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadEnvFile } from './load-env.js';

const created: string[] = [];

afterEach(() => {
  for (const dir of created.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
  delete process.env.LOAD_ENV_TEST_A;
  delete process.env.LOAD_ENV_TEST_B;
});

describe('loadEnvFile', () => {
  it('loads keys without overriding existing env', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ghostemail-env-'));
    created.push(dir);
    const path = join(dir, '.env');
    writeFileSync(path, 'LOAD_ENV_TEST_A=from-file\nLOAD_ENV_TEST_B=two\n');
    process.env.LOAD_ENV_TEST_A = 'already-set';

    loadEnvFile(path);

    expect(process.env.LOAD_ENV_TEST_A).toBe('already-set');
    expect(process.env.LOAD_ENV_TEST_B).toBe('two');
  });
});
