import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

export interface LastRunState {
  lastRunAt: string;
}

const DEFAULT_STATE_FILE = 'state/last-run.json';

export function resolveStateFile(): string {
  return process.env.STATE_FILE ?? DEFAULT_STATE_FILE;
}

export async function readLastRun(stateFile = resolveStateFile()): Promise<Date | null> {
  try {
    const raw = await readFile(stateFile, 'utf8');
    const data = JSON.parse(raw) as Partial<LastRunState>;
    if (!data.lastRunAt) return null;
    const parsed = new Date(data.lastRunAt);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

export async function writeLastRun(at: Date, stateFile = resolveStateFile()): Promise<void> {
  await mkdir(path.dirname(stateFile), { recursive: true });
  const payload: LastRunState = { lastRunAt: at.toISOString() };
  await writeFile(stateFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}
