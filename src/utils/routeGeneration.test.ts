// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';

test.each(['esm', 'cjs', 'generator'])('%s preserves page and modal routes', (mode) => {
  const directory = mkdtempSync(join(tmpdir(), 'shottimer-routes-'));
  const output = join(directory, 'router.ts');
  try {
    execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `
          import { createRequire } from 'node:module';
          import { dirname, join } from 'node:path';
          const require = createRequire(import.meta.url);
          const options = { output: process.argv[1], format: false };
          if (process.argv[2] === 'generator') {
            const { generate } = require(join(dirname(require.resolve('@generouted/solid-router/plugin')), 'generate.cjs'));
            await generate({ ...options, source: {} });
          } else {
            const plugin = process.argv[2] === 'esm'
              ? (await import('@generouted/solid-router/plugin')).default
              : require('@generouted/solid-router/plugin').default;
            await plugin(options).buildStart();
          }
        `,
        output,
        mode,
      ],
      { cwd: process.cwd(), stdio: 'pipe' },
    );
    const generated = readFileSync(output, 'utf8');
    expect(generated).toContain('export type Path =\n  | `/`\n  | `/:id`');
    expect(generated).toContain("'/:id': { id: string }");
    expect(generated).toContain('export type ModalPath = `/rules` | `/settings`');
    expect(generated).not.toContain('src/pages');
    expect(generated).not.toContain('/404');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
