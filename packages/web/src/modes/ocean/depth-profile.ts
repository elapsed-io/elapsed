/**
 * The dive profile, ocean depth's results replay (plan, Display modes > Results replays; the "results: ocean
 * depth (build this one)" frame): the shared profile chart (modes/shared/profile-chart.ts) going down from the
 * top, the card lit by the water (the light model dimmed to 80 %, from 20 m above to 60 m below), things rising
 * past as the dive crosses their zone, and its finale: two soft sonar pings from the deepest point as the replay
 * ends.
 */

import { BRAND, CONFIG, oceanLitColour, pickLandmarks } from '@stopwatch/core';
import type { OceanZone, Session } from '@stopwatch/core';
import { html, svg } from '../../dom.ts';
import type { ReplaySurface } from '../contract.ts';
import { drawProfile, grouped, percent } from '../shared/profile-chart.ts';
import type { FinaleContext, ProfileOptions, ProfileSpec } from '../shared/profile-chart.ts';
import './depth-profile.css';

const OCEAN = CONFIG.modes.ocean;
const CHART = OCEAN.results;
const ZONES: readonly OceanZone[] = ['sunlight', 'twilight', 'midnight', 'abyssal', 'hadal'];

/** Two soft sonar pings from the deepest point as the replay ends. */
function pings({ doc, surface, geometry }: FinaleContext): HTMLElement[] {
  const { fromRadiusPx, toRadiusPx, strokePx, durationMs, lagMs, opacity, count } = CHART.pings;
  return Array.from({ length: count }, (_, index) => {
    const size = 2 * toRadiusPx;
    const ping = html(doc, 'div', { class: 'profile__ping', attrs: { 'aria-hidden': 'true' } }, [
      svg(doc, 'svg', { class: 'profile__ping-ring', viewBox: `0 0 ${String(size)} ${String(size)}` }, [svg(doc, 'circle', { cx: toRadiusPx, cy: toRadiusPx, r: toRadiusPx - strokePx / 2, 'stroke-width': strokePx })]),
    ]);
    ping.style.setProperty('--ping-x', percent(geometry.head.x / CHART.widthPx));
    ping.style.setProperty('--ping-y', percent(geometry.head.y / CHART.heightPx));
    ping.animate(
      [
        { transform: `translate(-50%, -50%) scale(${String(fromRadiusPx / toRadiusPx)})`, opacity },
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 0 },
      ],
      { duration: durationMs * surface.scale, delay: surface.lengthMs + index * lagMs * surface.scale, easing: 'linear', fill: 'none' },
    );
    return ping;
  });
}

function zones(): ProfileSpec['zones'] {
  const { sunlight, twilight, midnight, abyssal } = OCEAN.zones;
  const starts = [0, sunlight, twilight, midnight, abyssal, OCEAN.maxDepthMetres + 1];
  return ZONES.map((id, index) => ({ id, name: BRAND.copy.ocean.zones[id], from: starts[index] ?? 0, to: starts[index + 1] ?? 0 }));
}

export const DIVE: ProfileSpec = {
  direction: 'down',
  metresPerFocusedMinute: OCEAN.metresPerFocusedMinute,
  maxMetres: OCEAN.maxDepthMetres,
  chart: {
    widthPx: CHART.widthPx,
    heightPx: CHART.heightPx,
    minScaleMetres: CHART.minScaleMetres,
    scaleHeadroom: CHART.scaleHeadroom,
    textInsetPx: CHART.textInsetPx,
    valueBaselinePx: CHART.depthBaselinePx,
    zoneBaselinePx: CHART.zoneBaselinePx,
    lineWidthPx: CHART.lineWidthPx,
    headRadiusPx: CHART.headRadiusPx,
    zoneLines: { ...CHART.zoneLines, at: CHART.zoneLines.depths, names: (['twilight', 'midnight', 'abyssal'] as const).map((zone) => BRAND.copy.ocean.zones[zone]) },
    landmark: CHART.landmark,
  },
  zones: zones(),
  copy: { value: BRAND.copy.ocean.depth, token: '{depth}', profile: BRAND.copy.ocean.profile, landmarksPassed: BRAND.copy.ocean.landmarksPassed },
  valueClass: 'profile__depth',
  pickLandmarks: (random) =>
    pickLandmarks(random).map((landmark) => ({
      at: landmark.depth,
      id: landmark.id,
      label: BRAND.copy.ocean.landmark.replace('{name}', BRAND.copy.ocean.landmarks[landmark.id]).replace('{depth}', grouped(landmark.depth)),
    })),
  lit: { colour: oceanLitColour, nearMetres: CHART.lit.aboveMetres, farMetres: CHART.lit.belowMetres, blackFromMetres: CHART.lit.blackFromMetres, crossfadeMs: CHART.lit.crossfadeMs, stepMetres: 1 },
  passing: { ...CHART.passing, catalog: async () => (await import('../../art/ocean/passing.ts')).OCEAN_PASSING },
  finale: (context) => ({ chart: pings(context) }),
};

export async function drawDepthProfile(surface: ReplaySurface, session: Session, options: ProfileOptions = { landmarks: true }): Promise<void> {
  await drawProfile(DIVE, surface, session, options);
}
