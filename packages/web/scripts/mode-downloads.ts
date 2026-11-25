/**
 * Each display mode's download, as source modules relative to packages/web: its descriptor (the manifest's
 * source) and the modules its recipe fetches (src/modes/sources.ts). For the build's scripts and plugins only.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MODE_MANIFESTS } from '../src/modes/manifests.ts';
import { MODE_BUILD, recipeSources } from '../src/modes/sources.ts';

const WEB = new URL('../', import.meta.url);

export function modeDownload(id: string): string[] {
  const manifest = MODE_MANIFESTS.find((candidate) => candidate.id === id);
  const build = MODE_BUILD[id];
  if (manifest === undefined || build === undefined) throw new Error(`no mode ${id}`);
  const recipe = JSON.parse(readFileSync(fileURLToPath(new URL(build.recipe, WEB)), 'utf8')) as Parameters<typeof recipeSources>[0];
  return [manifest.source, ...recipeSources(recipe, build.environment)];
}

/** Every mode's download, by mode id. */
export function modeDownloads(): Record<string, string[]> {
  return Object.fromEntries(MODE_MANIFESTS.map((manifest) => [manifest.id, modeDownload(manifest.id)]));
}

/** The modules core modes draw with: the core imports them, so none is a download of its own. */
export function coreModeSources(): Set<string> {
  return new Set(MODE_MANIFESTS.filter((manifest) => manifest.tier === 'core').flatMap((manifest) => modeDownload(manifest.id)));
}
