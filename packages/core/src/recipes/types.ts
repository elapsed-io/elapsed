/**
 * A display-mode recipe, version 1 (docs/recipes/mode-recipes.md): the shape mode-recipe-1.schema.json allows,
 * as the site reads it once the loader has checked it (load.ts). Everything is read-only: a loaded recipe is
 * frozen.
 */

/** A hex colour (#rrggbb or #rrggbbaa) or a theme token. */
export type RecipeColour = string;
export type StateName = 'running' | 'paused' | 'checkin' | 'results';
/** A pair of numbers, low to high. */
export type Range = readonly [number, number];
/** A point in fractions of the screen (or the camera's view), 0 to 1. */
export type Point = readonly [number, number];
export type Source = 'measure' | 'progress' | `cycle:${string}`;

/** A number that follows the measure, a cycle or the replay's progress through stops; no formulas. */
export type Binding = number | { readonly by: Source; readonly stops: readonly Range[]; readonly ease?: 'linear' | 'smooth' };

export interface Measure {
  readonly unit: 'time' | 'm' | 'km' | 'au' | 'years' | 'turns' | 'percent' | 'custom';
  readonly unitLabel?: string;
  readonly perMinute: number;
  readonly start?: number;
  readonly max?: number;
  readonly decimals?: number;
  readonly records?: 'comparable' | 'mode-only';
}

/** A phase of a cycle: its id, and where it starts and ends as shares of the cycle. */
export type Phase = readonly [string, number, number];
export interface Cycle {
  readonly id: string;
  /** Its length; for a calendar cycle, the length of one of its days. */
  readonly minutes: number;
  readonly phases?: readonly Phase[];
  /** A Gregorian perpetual calendar counting days of `minutes` each, from Monday 1 January 2024 (calendar.ts). */
  readonly calendar?: 'gregorian';
}

/** A zone: its id, its name as shown, and where it starts along the measure. */
export type Zone = readonly [string, string, number];

export type Environment =
  | { readonly type: 'theme' }
  | { readonly type: 'stops'; readonly by?: Source; readonly stops: readonly (readonly [number, RecipeColour])[] }
  | {
      readonly type: 'light-falloff';
      readonly base: readonly [number, number, number];
      readonly k: readonly [number, number, number];
      readonly per?: number;
      readonly spread?: number;
      readonly resultsDim?: number;
    };

export interface Contrast {
  readonly light?: RecipeColour;
  readonly dark?: RecipeColour;
  readonly auto?: boolean;
}

export type Camera =
  | { readonly type: 'fixed' }
  | { readonly type: 'follow-zoom'; readonly anchor: Point; readonly angle: number; readonly resultsAngle?: number; readonly usable?: number; readonly minValue?: number };

export type Position = 'center' | 'top' | 'bottom' | Point;

interface LayerBase {
  readonly id: string;
  readonly when?: readonly StateName[];
  readonly variantOf?: { readonly option: string; readonly value: string | boolean };
  readonly space?: 'screen' | 'camera';
  readonly blurOnPause?: boolean;
  readonly opacity?: Binding;
}

export interface Hand {
  readonly length?: number;
  readonly width?: number;
  readonly color?: RecipeColour;
  /** How far it reaches back past the point it turns about. */
  readonly tail?: number;
}

export interface TimeLayer extends LayerBase {
  readonly type: 'time';
  readonly size?: number;
  readonly position?: Position;
  readonly seconds?: 'setting' | 'never';
}
export interface TextLayer extends LayerBase {
  readonly type: 'text';
  readonly template: string;
  readonly position?: Position;
  readonly size?: number;
  readonly color?: RecipeColour;
}
export interface RingLayer extends LayerBase {
  readonly type: 'ring';
  readonly cycle: string;
  readonly radius?: number;
  readonly thickness?: number;
  readonly track?: RecipeColour;
  readonly fill?: RecipeColour;
  readonly tail?: { readonly degrees?: number; readonly growIn?: boolean; readonly fade?: 'linear' | 'ease' };
  readonly head?: { readonly size?: number };
}
export interface DialLayer extends LayerBase {
  readonly type: 'dial';
  readonly cycle: string;
  readonly radius?: number;
  readonly ticks?: { readonly major?: number; readonly minor?: number };
  readonly labels?: { readonly count?: number; readonly format?: 'minutes' | 'hours' | 'none' };
  /** Slim baton indices, the first at 12; each stops short of a small dial in its way, or is left out. */
  readonly batons?: number;
  readonly hand?: Hand;
  readonly subdials?: readonly Subdial[];
}
export interface Subdial {
  readonly cycle: string;
  readonly radius?: number;
  readonly offset?: readonly [number, number];
  /** Its numbers, the first at 12 (in seconds, minutes or hours, by its cycle's length). */
  readonly labels?: number;
  /** Its ticks, longer at each number; without it, one a number (or a name, or an hour of its cycle). */
  readonly ticks?: number;
  /** The colour of the number at 12 (the seconds dial's red 60). */
  readonly topColor?: RecipeColour;
  readonly hand?: Hand;
  /** `dial` (default): a small dial with its marks and hand; `hand`: the hand alone (another hand from the centre). */
  readonly face?: 'dial' | 'hand';
  /** On a calendar cycle, what it shows: the date, the weekday, the month, the leap year, or the moon (a disc). */
  readonly part?: 'date' | 'weekday' | 'month' | 'leap-year' | 'moon';
  /** Its marks' names, one a place (for the parts: 31, 7, 12 or 4). */
  readonly names?: readonly string[];
  /** A word under it ("hours"). */
  readonly title?: string;
}

export interface TrackLayer extends LayerBase {
  readonly type: 'track';
  readonly width?: number;
  readonly pxPerMinute?: number;
  readonly ticks?: { readonly every?: number; readonly labelEvery?: number; readonly format?: 'hh:mm' | 'value' };
  readonly fadeEnds?: boolean;
  readonly past?: RecipeColour;
  readonly future?: RecipeColour;
  readonly drawBeforeStart?: boolean;
  readonly marker?: { readonly source?: 'personal-record'; readonly label?: string; readonly color?: RecipeColour };
}
export interface SpriteLayer extends LayerBase {
  readonly type: 'sprite';
  readonly slot: string;
  readonly frames: number;
  readonly frameBy?: { readonly cycle: string } | { readonly zone: true } | { readonly by: Source; readonly from?: number; readonly to?: number };
  readonly crossfade?: number;
  readonly position?: Position;
  readonly size?: readonly [number, number];
  readonly scale?: Binding;
}
export interface TreeLayer extends LayerBase {
  readonly type: 'tree';
  readonly view: 'side' | 'isometric';
  readonly year: string;
  readonly growth?: Binding;
  readonly leaves?: {
    readonly clusters?: number;
    readonly offsetMax?: number;
    readonly spring?: readonly RecipeColour[];
    readonly summer?: readonly RecipeColour[];
    readonly autumn?: readonly RecipeColour[];
    readonly fallBy?: 'autumn-end' | 'never';
  };
  readonly snow?: { readonly phase?: string; readonly branches?: boolean; readonly ground?: boolean };
  readonly trunk?: RecipeColour;
  readonly ground?: 'line' | 'field' | 'none';
  readonly grass?: RecipeColour;
}
export interface PassingItem {
  readonly slot: string;
  readonly from: number;
  readonly to: number;
  readonly x?: number;
  readonly opacity?: number;
  readonly size?: number;
}
export interface PassingLayer extends LayerBase {
  readonly type: 'passing';
  readonly direction: 'up' | 'down' | 'left' | 'right';
  readonly items: readonly PassingItem[];
}
export interface ParticlesLayer extends LayerBase {
  readonly type: 'particles';
  readonly shape: 'streak' | 'comet' | 'dot' | 'flake' | 'image';
  readonly slot?: string;
  readonly catalogByZone?: Readonly<Record<string, readonly string[]>>;
  readonly visibleWhen?: { readonly by?: Source; readonly min?: number; readonly max?: number; readonly phase?: string };
  readonly every: Range;
  readonly maxAtOnce: number;
  readonly lifetime?: Range;
  readonly size?: { readonly length?: Range; readonly thickness?: Range; readonly head?: Range; readonly scale?: Range };
  readonly colors?: readonly RecipeColour[];
  readonly angle?: Range;
  readonly distance?: Range;
  readonly orient?: 'travel' | 'away-from-anchor' | 'none';
  readonly depths?: number;
  readonly arrive?: 'fade' | 'drift-in';
  readonly leaveOnResume?: boolean;
  readonly bursts?: { readonly every?: Range; readonly count?: Range; readonly within?: number };
}
export interface StarfieldLayer extends LayerBase {
  readonly type: 'starfield';
  readonly slot: string;
  readonly magnitudeMax?: number;
  readonly projection?: { readonly type?: 'gnomonic' | 'equirectangular'; readonly ra?: number; readonly dec?: number; readonly pxPerDegree?: number };
  readonly radius?: { readonly min?: number; readonly at0?: number; readonly perMagnitude?: number };
  readonly pan?: { readonly when?: readonly StateName[]; readonly turnMinutes?: number };
}
export interface CirclesLayer extends LayerBase {
  readonly type: 'circles';
  readonly color?: RecipeColour;
  readonly fadeBelowPx?: number;
  readonly items: readonly { readonly at: number; readonly label?: string; readonly dashed?: boolean }[];
}
export interface PathLayer extends LayerBase {
  readonly type: 'path';
  readonly from?: number;
  readonly color?: RecipeColour;
  readonly width?: number;
  readonly head?: { readonly size?: number; readonly color?: RecipeColour };
}
export interface LandmarksLayer extends LayerBase {
  readonly type: 'landmarks';
  readonly slot: string;
  readonly anchor?: 'path' | 'chart';
  readonly perBand?: { readonly size?: number; readonly max?: number };
  readonly maxTotal?: number;
  readonly dot?: RecipeColour;
  readonly fadeBelowPx?: number;
  readonly labels?: { readonly pop?: boolean; readonly fadeAfterReplay?: boolean; readonly hover?: boolean; readonly template?: string };
}
export type RadialStop = readonly [number, RecipeColour];
export interface ShapeLayer extends LayerBase {
  readonly type: 'shape';
  readonly shape: 'circle' | 'rect' | 'ellipse';
  readonly size: readonly [number, number];
  readonly x?: Binding;
  readonly y?: Binding;
  readonly fill?: RecipeColour | { readonly radial: readonly RadialStop[] };
  readonly glow?: { readonly blur?: number; readonly color?: RecipeColour };
}
export interface RevealLayer extends LayerBase {
  readonly type: 'reveal';
  readonly slot: string;
  readonly direction: 'up' | 'down' | 'left' | 'right' | 'radial';
  readonly by: Binding;
}
export interface ImagePathLayer extends LayerBase {
  readonly type: 'image-path';
  readonly slot: string;
  readonly points: readonly Point[];
  readonly by: Binding;
  readonly marker?: RecipeColour;
}

export type Layer =
  | TimeLayer
  | TextLayer
  | RingLayer
  | DialLayer
  | TrackLayer
  | SpriteLayer
  | TreeLayer
  | PassingLayer
  | ParticlesLayer
  | StarfieldLayer
  | CirclesLayer
  | PathLayer
  | LandmarksLayer
  | ShapeLayer
  | RevealLayer
  | ImagePathLayer;
export type LayerType = Layer['type'];
export type LayerOf<T extends LayerType> = Extract<Layer, { readonly type: T }>;

export interface StateTreatment {
  readonly blur?: 'display' | readonly string[];
  readonly caption?: string;
  readonly show?: readonly string[];
}

export type ResultsView =
  | { readonly type: 'strip' }
  | { readonly type: 'rings-per-hour'; readonly hand?: boolean; readonly fitAfterHours?: number }
  | { readonly type: 'profile'; readonly direction?: 'down' | 'up' }
  | { readonly type: 'scene'; readonly layers: readonly string[]; readonly camera?: boolean };

export type Finale = { readonly type: 'ping'; readonly count?: number; readonly color?: RecipeColour } | { readonly type: 'show'; readonly layer: string };

export interface Results {
  readonly replay: { readonly seconds: number; readonly easing: 'fast' | 'gentle'; readonly longSessionExtra?: boolean };
  readonly view: ResultsView;
  readonly card?: { readonly environment?: 'theme' | 'follow-replay'; readonly startFrom?: 'start' | 'session-end'; readonly crossSeconds?: number };
  readonly show?: readonly string[];
  readonly finale?: readonly Finale[];
}

export interface RecipeOption {
  readonly id: string;
  readonly label: string;
  readonly kind: 'switch' | 'segmented';
  readonly choices?: readonly string[];
  readonly default: string | boolean;
  readonly toggles?: readonly string[];
}

export type SlotKind = 'image' | 'image-strip' | 'star-catalog' | 'landmark-list';
export interface Slot {
  readonly id: string;
  readonly kind: SlotKind;
  readonly frames?: number;
  readonly size?: readonly [number, number];
  /** A built-in asset, `builtin:<path>`; never an outside file or address. */
  readonly default: string;
}

export interface Recipe {
  readonly recipe: 1;
  readonly id: string;
  readonly name: string;
  readonly visibility?: 'public' | 'test';
  readonly icon?: string;
  readonly measure: Measure;
  readonly cycles?: readonly Cycle[];
  readonly zones?: readonly Zone[];
  readonly environment?: Environment;
  readonly contrast?: Contrast;
  readonly camera?: Camera;
  readonly layers: readonly Layer[];
  readonly states?: { readonly paused?: StateTreatment; readonly checkin?: StateTreatment };
  readonly results: Results;
  readonly options?: readonly RecipeOption[];
  readonly slots?: readonly Slot[];
}
