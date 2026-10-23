const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype;

/**
 * Merges `layer` onto `base`: plain objects merge key by key, everything else — arrays, numbers,
 * strings, `null` — replaces. `undefined` never overrides anything.
 */
export const mergeOptions = <Options extends object>(base: Options, layer: object): Options => {
  const merged: Record<string, unknown> = { ...(base as Record<string, unknown>) };

  for (const [key, value] of Object.entries(layer)) {
    if (value === undefined) continue;

    const current = merged[key];
    merged[key] =
      isPlainObject(current) && isPlainObject(value) ? mergeOptions(current, value) : value;
  }

  return merged as Options;
};

/**
 * Immutable, extendable configuration of one glitchspeak module.
 *
 * A preset only stores the options it sets. `resolve()` lays them over the module's complete
 * default, so a preset never has to repeat what it does not change.
 */
export abstract class Preset<Options extends object, Resolved, Name extends string = string> {
  readonly name: string | undefined;
  readonly options: Readonly<Options>;

  constructor(options: Options, name?: string) {
    this.options = options;
    this.name = name;
  }

  /**
   * Returns a new preset: this one, then every layer applied from left to right.
   * A layer is a built-in name, another preset of the same module, or plain options.
   */
  extends(...layers: ReadonlyArray<Name | Preset<Options, Resolved, Name> | Options>): this {
    const options = layers.reduce<Options>(
      (merged, layer) => mergeOptions(merged, this.toOptions(layer)),
      this.options,
    );

    return this.create(options);
  }

  /** The complete configuration: the module default, then this preset's options. */
  abstract resolve(): Resolved;

  protected abstract create(options: Options): this;

  protected abstract lookup(name: Name): Preset<Options, Resolved, Name>;

  private toOptions(layer: Name | Preset<Options, Resolved, Name> | Options): Options {
    if (typeof layer === "string") return this.lookup(layer).options;
    if (layer instanceof Preset) return layer.options;

    return layer;
  }
}
