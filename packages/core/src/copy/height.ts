/**
 * Height's copy (plan, Architecture invariant 12; round 2.10): in a module of its own, so only the
 * download that shows it carries it. The brand module's rules apply (brand.ts): every user-facing string lives in
 * the brand module and these copy modules, lowercase.
 */

export const HEIGHT_COPY = {
  height: '{height} m',
  layers: { troposphere: 'troposphere', stratosphere: 'stratosphere', mesosphere: 'mesosphere', thermosphere: 'thermosphere' },
  landmarks: {
    burjKhalifa: 'height of the burj khalifa',
    highestTown: 'highest town on earth',
    everest: 'summit of everest',
    airliner: 'airliner cruising altitude',
    highestBird: 'highest bird ever recorded',
    concorde: 'concorde cruising altitude',
    armstrongLimit: 'armstrong limit: blood would boil',
    ozoneLayer: 'heart of the ozone layer',
    baumgartner: 'felix baumgartner’s jump',
    eustace: 'alan eustace’s jump',
    stratopause: 'top of the stratosphere',
    highestBalloon: 'highest uncrewed balloon',
    astronautWings: 'us astronaut wings',
    noctilucent: 'noctilucent clouds',
    meteors: 'where most meteors burn up',
    karman: 'kármán line: where space begins',
  },
  /** A landmark on the climb profile: its name and height. */
  landmark: '{name} · {height} m',
  /** The climb profile, read on request (the frame's own words). */
  profile: 'climb profile: altitude over the session',
  /** The landmarks the climb passed, listed for screen readers. */
  landmarksPassed: 'landmarks passed',
  /** While paused, at the bottom: the altitude and the layer of the atmosphere ("31,240 m · stratosphere"). */
  altitude: '{height} m · {layer}',
} as const;
