/**
 * The climb profile, height's results replay (plan, Display modes > Results replays; the "results: height
 * (build this one)" frame): the shared profile chart (modes/shared/profile-chart.ts) going up from the bottom,
 * the card lit by the sky (the light model dimmed to 65 %, from 1,500 m below to 1,500 m above, never below the
 * ground), things falling past as the climb passes their heights, and its finale: the stars fade in above
 * 18 km, and Earth's curved horizon fades in and rises from about 15 km, showing more of its curve on higher
 * climbs. Both are derived from the replay's one progress in climb-profile.css; at rest they hold the values
 * computed here, as the frame draws them.
 */

import { BRAND, CONFIG, pickHeightLandmarks, skyLitColour } from '@stopwatch/core';
import type { AtmosphereLayer, Session } from '@stopwatch/core';
import { html } from '../../dom.ts';
import { ART } from '../../art/registry.ts';
import type { ReplaySurface } from '../contract.ts';
import { drawProfile, grouped, smoothstep } from '../shared/profile-chart.ts';
import type { FinaleContext, ProfileOptions, ProfileSpec } from '../shared/profile-chart.ts';
import './climb-profile.css';

const HEIGHT = CONFIG.modes.height;
const CHART = HEIGHT.results;
const LAYERS: readonly AtmosphereLayer[] = ['troposphere', 'stratosphere', 'mesosphere', 'thermosphere'];

/** The stars and the horizon on the card, at rest where the climb ended. */
function sky({ doc, geometry }: FinaleContext): HTMLElement[] {
  const reached = geometry.reached;
  const art = ART.draw(doc, 'sky/stars-card', 'art climb__stars-art');
  art.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  const stars = html(doc, 'div', { class: 'climb__stars' }, [art]);
  stars.style.setProperty('--stars-final', smoothstep((reached - CHART.stars.fromMetres) / CHART.stars.spanMetres).toFixed(2));
  const { fromPx, risePx, fadeFromMetres, fadeSpanMetres, highFromMetres, highSpanMetres, highRisePx } = CHART.horizon;
  const shown = smoothstep((reached - fadeFromMetres) / fadeSpanMetres);
  const higher = smoothstep((reached - highFromMetres) / highSpanMetres);
  const horizon = html(doc, 'div', { class: 'climb__horizon' });
  horizon.style.setProperty('--horizon-y-final', String(Number((fromPx - risePx * shown - highRisePx * higher).toFixed(1)) / CHART.passing.cardHeightPx));
  horizon.style.setProperty('--horizon-final', shown.toFixed(2));
  return [stars, horizon];
}

function layers(): ProfileSpec['zones'] {
  const { troposphere, stratosphere, mesosphere } = HEIGHT.layers;
  const starts = [0, troposphere, stratosphere, mesosphere, HEIGHT.maxHeightMetres + 1];
  return LAYERS.map((id, index) => ({ id, name: BRAND.copy.height.layers[id], from: starts[index] ?? 0, to: starts[index + 1] ?? 0 }));
}

export const CLIMB: ProfileSpec = {
  direction: 'up',
  metresPerFocusedMinute: HEIGHT.metresPerFocusedMinute,
  maxMetres: HEIGHT.maxHeightMetres,
  chart: {
    widthPx: CHART.widthPx,
    heightPx: CHART.heightPx,
    minScaleMetres: CHART.minScaleMetres,
    scaleHeadroom: CHART.scaleHeadroom,
    textInsetPx: CHART.textInsetPx,
    valueBaselinePx: CHART.valueBaselinePx,
    zoneBaselinePx: CHART.zoneBaselinePx,
    lineWidthPx: CHART.lineWidthPx,
    headRadiusPx: CHART.headRadiusPx,
    zoneLines: { ...CHART.zoneLines, at: CHART.zoneLines.heights, names: (['stratosphere', 'mesosphere', 'thermosphere'] as const).map((layer) => BRAND.copy.height.layers[layer]) },
    // The same markers as ocean depth's (both frames draw them alike), passed over the climb's own distances.
    landmark: { ...CONFIG.modes.ocean.results.landmark, ...CHART.landmark },
  },
  zones: layers(),
  copy: { value: BRAND.copy.height.height, token: '{height}', profile: BRAND.copy.height.profile, landmarksPassed: BRAND.copy.height.landmarksPassed },
  valueClass: 'profile__height',
  pickLandmarks: (random) =>
    pickHeightLandmarks(random).map((landmark) => ({
      at: landmark.height,
      id: landmark.id,
      label: BRAND.copy.height.landmark.replace('{name}', BRAND.copy.height.landmarks[landmark.id]).replace('{height}', grouped(landmark.height)),
    })),
  lit: { colour: skyLitColour, nearMetres: CHART.lit.belowMetres, farMetres: CHART.lit.aboveMetres, blackFromMetres: CHART.lit.blackFromMetres, crossfadeMs: CHART.lit.crossfadeMs, stepMetres: CHART.lit.stepMetres },
  passing: { ...CHART.passing, catalog: async () => (await import('../../art/height/results.ts')).HEIGHT_RESULTS },
  finale: (context) => ({ backdrop: sky(context) }),
};

export async function drawClimbProfile(surface: ReplaySurface, session: Session, options: ProfileOptions = { landmarks: true }): Promise<void> {
  await drawProfile(CLIMB, surface, session, options);
}
