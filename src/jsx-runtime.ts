import { renderRoot, type DiscordTsxElement } from "./runtime.js";
import type { DiscordTagComponent } from "./tags.js";

export const Fragment = Symbol.for("discord-tsx-builder.fragment");

type JsxType = DiscordTagComponent<unknown> | ((props: Record<string, unknown>) => unknown) | typeof Fragment;

function isTagComponent(value: unknown): value is DiscordTagComponent<unknown> {
  return typeof value === "function" && "$$discordTag" in value;
}

function baseCreateElement(
  type: JsxType,
  props: Record<string, unknown> | null,
  key?: unknown
): unknown {
  const normalizedProps = props ?? {};
  if (key !== undefined) {
    normalizedProps.key = key;
  }

  if (type === Fragment) {
    return normalizedProps.children ?? null;
  }

  if (isTagComponent(type)) {
    const element: DiscordTsxElement = {
      __discordTsxElement: true,
      tag: type.$$discordTag,
      props: normalizedProps
    };
    return renderRoot(element);
  }

  if (typeof type === "function") {
    return type(normalizedProps);
  }

  throw new Error("Invalid JSX tag passed to discord-tsx-builder runtime.");
}

export function jsx(type: JsxType, props: Record<string, unknown> | null, key?: unknown): unknown {
  return baseCreateElement(type, props, key);
}

export function jsxs(type: JsxType, props: Record<string, unknown> | null, key?: unknown): unknown {
  return baseCreateElement(type, props, key);
}

export function jsxDEV(
  type: JsxType,
  props: Record<string, unknown> | null,
  key: unknown,
  _isStaticChildren: boolean,
  _source: unknown,
  _self: unknown
): unknown {
  return baseCreateElement(type, props, key);
}

export namespace JSX {
  export type Element = unknown;
  export interface ElementChildrenAttribute {
    children: unknown;
  }
  export interface IntrinsicElements {
    [elemName: string]: Record<string, unknown>;
  }
}
