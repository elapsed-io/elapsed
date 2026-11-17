/**
 * A JSON Schema (draft 2020-12) validator for the keywords the recipe schema uses, and no others: type, const,
 * enum, properties, additionalProperties, required, items, minItems, maxItems, uniqueItems, minimum, maximum,
 * minLength, maxLength, pattern, maxProperties, oneOf, anyOf and $ref to "#/$defs/…". A keyword it does not
 * know is an error in the schema, not something to skip, so a schema change cannot loosen validation unseen.
 * No dependency: the site adds none at run time (owner's rule).
 */

export type Json = null | boolean | number | string | readonly Json[] | { readonly [key: string]: Json };

export interface SchemaProblem {
  /** Where in the value, as JSON Pointer-ish segments. */
  readonly path: readonly (string | number)[];
  readonly message: string;
}

type Schema = Readonly<Record<string, unknown>>;

const KNOWN = new Set([
  '$comment',
  '$schema',
  '$id',
  '$defs',
  'title',
  'type',
  'const',
  'enum',
  'properties',
  'additionalProperties',
  'required',
  'items',
  'minItems',
  'maxItems',
  'uniqueItems',
  'minimum',
  'maximum',
  'minLength',
  'maxLength',
  'pattern',
  'maxProperties',
  'oneOf',
  'anyOf',
  '$ref',
]);

const isObject = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === 'object' && value !== null && !Array.isArray(value);

function typeOf(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
  return typeof value;
}

function matchesType(value: unknown, type: string): boolean {
  const actual = typeOf(value);
  return actual === type || (type === 'number' && actual === 'integer');
}

/** Deep equality for JSON values (const, enum, uniqueItems). */
export function jsonEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((item, i) => jsonEqual(item, b[i]));
  if (isObject(a) && isObject(b)) {
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every((key) => Object.hasOwn(b, key) && jsonEqual(a[key], b[key]));
  }
  return false;
}

export class SchemaValidator {
  readonly #root: Schema;
  readonly #patterns = new Map<string, RegExp>();

  constructor(root: Schema) {
    this.#root = root;
  }

  validate(value: unknown): SchemaProblem[] {
    const problems: SchemaProblem[] = [];
    this.#check(this.#root, value, [], problems);
    return problems;
  }

  #resolve(ref: string): Schema {
    const match = /^#\/\$defs\/([A-Za-z0-9_-]+)$/.exec(ref);
    const defs = this.#root['$defs'];
    const target = match?.[1] !== undefined && isObject(defs) ? defs[match[1]] : undefined;
    if (!isObject(target)) throw new Error(`schema: unresolved $ref ${ref}`);
    return target;
  }

  #pattern(source: string): RegExp {
    let pattern = this.#patterns.get(source);
    if (pattern === undefined) {
      pattern = new RegExp(source, 'u');
      this.#patterns.set(source, pattern);
    }
    return pattern;
  }

  #check(schema: Schema, value: unknown, path: (string | number)[], problems: SchemaProblem[]): void {
    for (const key of Object.keys(schema)) if (!KNOWN.has(key)) throw new Error(`schema: unknown keyword ${key}`);
    const fail = (message: string): void => {
      problems.push({ path: [...path], message });
    };
    if (typeof schema['$ref'] === 'string') this.#check(this.#resolve(schema['$ref']), value, path, problems);
    const type = schema['type'];
    if (type !== undefined) {
      const types = Array.isArray(type) ? (type as string[]) : [type as string];
      if (!types.some((candidate) => matchesType(value, candidate))) {
        fail(`must be ${types.join(' or ')}`);
        return;
      }
    }
    if ('const' in schema && !jsonEqual(value, schema['const'])) fail(`must be ${JSON.stringify(schema['const'])}`);
    if (Array.isArray(schema['enum']) && !(schema['enum'] as unknown[]).some((option) => jsonEqual(value, option))) fail(`must be one of ${JSON.stringify(schema['enum'])}`);
    if (typeof value === 'number') {
      if (typeof schema['minimum'] === 'number' && value < schema['minimum']) fail(`must be at least ${String(schema['minimum'])}`);
      if (typeof schema['maximum'] === 'number' && value > schema['maximum']) fail(`must be at most ${String(schema['maximum'])}`);
    }
    if (typeof value === 'string') {
      // Code points, as JSON Schema counts them.
      let length = 0;
      for (let i = 0; i < value.length; i += 1) {
        length += 1;
        if ((value.codePointAt(i) ?? 0) > 0xffff) i += 1;
      }
      if (typeof schema['minLength'] === 'number' && length < schema['minLength']) fail(`must be at least ${String(schema['minLength'])} characters`);
      if (typeof schema['maxLength'] === 'number' && length > schema['maxLength']) fail(`must be at most ${String(schema['maxLength'])} characters`);
      if (typeof schema['pattern'] === 'string' && !this.#pattern(schema['pattern']).test(value)) fail('does not match its pattern');
    }
    if (Array.isArray(value)) {
      if (typeof schema['minItems'] === 'number' && value.length < schema['minItems']) fail(`must have at least ${String(schema['minItems'])} items`);
      if (typeof schema['maxItems'] === 'number' && value.length > schema['maxItems']) fail(`must have at most ${String(schema['maxItems'])} items`);
      if (schema['uniqueItems'] === true && value.some((item, i) => value.some((other, j) => j < i && jsonEqual(item, other)))) fail('items must be unique');
      if (isObject(schema['items'])) {
        const items = schema['items'];
        value.forEach((item, i) => {
          this.#check(items, item, [...path, i], problems);
        });
      }
    }
    if (isObject(value)) {
      const properties = isObject(schema['properties']) ? schema['properties'] : {};
      if (Array.isArray(schema['required'])) for (const key of schema['required'] as string[]) if (!Object.hasOwn(value, key)) fail(`must have ${key}`);
      if (typeof schema['maxProperties'] === 'number' && Object.keys(value).length > schema['maxProperties']) fail(`must have at most ${String(schema['maxProperties'])} properties`);
      for (const [key, item] of Object.entries(value)) {
        const own = properties[key];
        if (isObject(own)) this.#check(own, item, [...path, key], problems);
        else if (schema['additionalProperties'] === false) fail(`unknown field ${key}`);
        else if (isObject(schema['additionalProperties'])) this.#check(schema['additionalProperties'], item, [...path, key], problems);
      }
    }
    for (const keyword of ['oneOf', 'anyOf'] as const) {
      const options = schema[keyword];
      if (!Array.isArray(options)) continue;
      const passing = (options as Schema[]).filter((option) => {
        const inner: SchemaProblem[] = [];
        this.#check(option, value, path, inner);
        return inner.length === 0;
      }).length;
      if (keyword === 'oneOf' ? passing !== 1 : passing === 0) fail(keyword === 'oneOf' ? `must match exactly one of its forms (matches ${String(passing)})` : 'must match one of its forms');
    }
  }
}
