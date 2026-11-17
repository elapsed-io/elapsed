/**
 * Ocean depth's copy (plan, Architecture invariant 12; round 2.10): in a module of its own, so only the
 * download that shows it carries it. The brand module's rules apply (brand.ts): every user-facing string lives in
 * the brand module and these copy modules, lowercase.
 */

export const OCEAN_COPY = {
  depth: '{depth} m',
  zones: { sunlight: 'sunlight zone', twilight: 'twilight zone', midnight: 'midnight zone', abyssal: 'abyssal zone', hadal: 'hadal zone' },
  landmarks: {
    scuba: 'recreational scuba limit',
    scubaRecord: 'deepest scuba dive on record',
    emperorPenguin: 'deepest emperor penguin dive',
    burjKhalifa: 'height of the burj khalifa',
    leatherback: 'leatherback turtle dive',
    baikal: 'bottom of lake baikal',
    grandCanyon: 'depth of the grand canyon',
    spermWhale: 'sperm whale hunting depth',
    elephantSeal: 'elephant seal record dive',
    beakedWhale: 'cuvier’s beaked whale record dive',
    averageOcean: 'average ocean depth',
    titanic: 'resting place of the titanic',
    bismarck: 'wreck of the bismarck',
    maunaLoa: 'base of mauna loa',
    hadal: 'hadal zone begins',
    deepestWreck: 'deepest shipwreck ever found',
    deepestFish: 'deepest fish ever filmed',
    puertoRico: 'bottom of the puerto rico trench',
    everest: 'everest would fit above you',
    challengerDeep: 'challenger deep, the bottom',
  },
  /** A landmark on the dive profile: its name and depth. */
  landmark: '{name} · {depth} m',
  /** The dive profile, read on request. */
  profile: 'dive profile: depth over the session, flat during pauses',
  /** The landmarks the dive passed, listed for screen readers. */
  landmarksPassed: 'landmarks passed',
} as const;
