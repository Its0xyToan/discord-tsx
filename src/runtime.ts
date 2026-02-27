import type { TagName } from "./tags.js";

export interface DiscordTsxElement {
  __discordTsxElement: true;
  tag: TagName | (string & {});
  props: Record<string, unknown>;
}

export type DiscordTsxNode =
  | DiscordTsxElement
  | string
  | number
  | boolean
  | null
  | undefined
  | DiscordTsxNode[];

export interface DiscordComponentsPayload {
  components: Record<string, unknown>[];
  flags?: number;
}

export const MessageFlags = {
  IsComponentsV2: 1 << 15
} as const;

const COMPONENT_TYPE = {
  ActionRow: 1,
  Button: 2,
  StringSelect: 3,
  UserSelect: 5,
  RoleSelect: 6,
  MentionableSelect: 7,
  ChannelSelect: 8,
  Section: 9,
  TextDisplay: 10,
  Thumbnail: 11,
  MediaGallery: 12,
  File: 13,
  Separator: 14,
  Container: 17
} as const;

const BUTTON_STYLE: Record<string, number> = {
  primary: 1,
  secondary: 2,
  success: 3,
  danger: 4,
  link: 5,
  premium: 6
};

const SELECT_TAGS = new Set([
  "StringSelectMenu",
  "UserSelectMenu",
  "RoleSelectMenu",
  "MentionableSelectMenu",
  "ChannelSelectMenu"
]);

const INTERACTIVE_TAGS = new Set(["Button", ...SELECT_TAGS]);

export function isDiscordTsxElement(value: unknown): value is DiscordTsxElement {
  return (
    typeof value === "object" &&
    value !== null &&
    "__discordTsxElement" in value &&
    (value as { __discordTsxElement?: unknown }).__discordTsxElement === true
  );
}

export function normalizeChildren(input: unknown): DiscordTsxNode[] {
  if (input === undefined || input === null || input === false || input === true) {
    return [];
  }

  if (Array.isArray(input)) {
    return input.flatMap((child) => normalizeChildren(child));
  }

  return [input as DiscordTsxNode];
}

function childrenOf(node: DiscordTsxElement): DiscordTsxNode[] {
  return normalizeChildren(node.props.children);
}

function elementChildrenOf(node: DiscordTsxElement): DiscordTsxElement[] {
  return childrenOf(node).filter(isDiscordTsxElement);
}

function assertElement(node: DiscordTsxNode, expectedTag?: string): DiscordTsxElement {
  if (!isDiscordTsxElement(node)) {
    throw new Error("Expected a Discord TSX element.");
  }

  if (expectedTag !== undefined && node.tag !== expectedTag) {
    throw new Error(`Expected <${expectedTag}> but received <${node.tag}>.`);
  }

  return node;
}

function readText(value: unknown): string {
  const parts: string[] = [];

  const push = (part: unknown): void => {
    if (part === undefined || part === null || part === false || part === true) {
      return;
    }

    if (Array.isArray(part)) {
      for (const nested of part) {
        push(nested);
      }
      return;
    }

    if (isDiscordTsxElement(part)) {
      for (const nested of childrenOf(part)) {
        push(nested);
      }
      return;
    }

    parts.push(String(part));
  };

  push(value);
  return parts.join("");
}

function firstChildByTag(node: DiscordTsxElement, tag: string): DiscordTsxElement | undefined {
  return elementChildrenOf(node).find((child) => child.tag === tag);
}

function colorToInt(color: unknown): unknown {
  if (typeof color === "number") {
    return color;
  }

  if (typeof color !== "string") {
    return color;
  }

  const hex = color.startsWith("#") ? color.slice(1) : color;
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
    return color;
  }

  return Number.parseInt(hex, 16);
}

function parseBoolean(input: unknown): boolean | undefined {
  if (typeof input === "boolean") {
    return input;
  }
  return undefined;
}

function parseButtonStyle(style: unknown): unknown {
  if (typeof style === "number") {
    return style;
  }

  if (typeof style === "string") {
    const lowered = style.trim().toLowerCase();
    return BUTTON_STYLE[lowered] ?? style;
  }

  return style;
}

function parseEmbedField(node: DiscordTsxElement): Record<string, unknown> {
  const nameNode = firstChildByTag(node, "FieldName");
  const valueNode = firstChildByTag(node, "FieldValue");
  const name = node.props.name ?? (nameNode ? readText(nameNode.props.children) : undefined);
  const value = node.props.value ?? (valueNode ? readText(valueNode.props.children) : undefined);

  if (name === undefined || value === undefined) {
    throw new Error("<Field> requires both <FieldName> and <FieldValue> (or name/value props).");
  }

  const inline = parseBoolean(node.props.inline);
  const field: Record<string, unknown> = { name, value };
  if (inline !== undefined) {
    field.inline = inline;
  }

  return field;
}

function parseEmbed(node: DiscordTsxElement): Record<string, unknown> {
  const embed: Record<string, unknown> = {};

  if ("color" in node.props) {
    embed.color = colorToInt(node.props.color);
  }

  for (const child of elementChildrenOf(node)) {
    switch (child.tag) {
      case "Title":
        embed.title = readText(child.props.children);
        break;
      case "Description":
        embed.description = readText(child.props.children);
        break;
      case "Url":
        embed.url = child.props.url ?? readText(child.props.children);
        break;
      case "Timestamp":
        embed.timestamp = child.props.value ?? readText(child.props.children);
        break;
      case "Color":
        embed.color = colorToInt(child.props.value ?? readText(child.props.children));
        break;
      case "Image":
        embed.image = { url: child.props.url ?? readText(child.props.children) };
        break;
      case "Thumbnail":
        embed.thumbnail = { url: child.props.url ?? child.props.src ?? readText(child.props.children) };
        break;
      case "Author": {
        const author: Record<string, unknown> = {};
        author.name = child.props.name ?? firstChildByTag(child, "AuthorName")?.props.children;
        author.icon_url =
          child.props.iconUrl ??
          child.props.icon_url ??
          firstChildByTag(child, "AuthorIconUrl")?.props.children;
        author.url = child.props.url ?? firstChildByTag(child, "AuthorUrl")?.props.children;
        if (author.name !== undefined) {
          author.name = readText(author.name);
        }
        if (author.icon_url !== undefined) {
          author.icon_url = readText(author.icon_url);
        }
        if (author.url !== undefined) {
          author.url = readText(author.url);
        }
        embed.author = author;
        break;
      }
      case "Footer": {
        const footer: Record<string, unknown> = {};
        footer.text = child.props.text ?? firstChildByTag(child, "FooterText")?.props.children;
        footer.icon_url =
          child.props.iconUrl ??
          child.props.icon_url ??
          firstChildByTag(child, "FooterIconUrl")?.props.children;
        if (footer.text !== undefined) {
          footer.text = readText(footer.text);
        }
        if (footer.icon_url !== undefined) {
          footer.icon_url = readText(footer.icon_url);
        }
        embed.footer = footer;
        break;
      }
      case "Fields": {
        const fields = elementChildrenOf(child).filter((entry) => entry.tag === "Field").map(parseEmbedField);
        embed.fields = [...((embed.fields as Record<string, unknown>[] | undefined) ?? []), ...fields];
        break;
      }
      case "Field":
        embed.fields = [...((embed.fields as Record<string, unknown>[] | undefined) ?? []), parseEmbedField(child)];
        break;
      default:
        throw new Error(`Unsupported tag <${child.tag}> inside <DiscordEmbed>.`);
    }
  }

  return embed;
}

function parseSelectType(tag: string): number {
  switch (tag) {
    case "StringSelectMenu":
      return COMPONENT_TYPE.StringSelect;
    case "UserSelectMenu":
      return COMPONENT_TYPE.UserSelect;
    case "RoleSelectMenu":
      return COMPONENT_TYPE.RoleSelect;
    case "MentionableSelectMenu":
      return COMPONENT_TYPE.MentionableSelect;
    case "ChannelSelectMenu":
      return COMPONENT_TYPE.ChannelSelect;
    default:
      throw new Error(`Unsupported select menu tag <${tag}>.`);
  }
}

function parseOption(node: DiscordTsxElement): Record<string, unknown> {
  const option: Record<string, unknown> = {};
  option.label = node.props.label ?? readText(node.props.children);
  option.value = node.props.value ?? option.label;
  if ("description" in node.props) {
    option.description = node.props.description;
  }
  if ("emoji" in node.props) {
    option.emoji = node.props.emoji;
  }
  if ("default" in node.props) {
    option.default = node.props.default;
  }
  return option;
}

function parseButton(node: DiscordTsxElement): Record<string, unknown> {
  const button: Record<string, unknown> = { type: COMPONENT_TYPE.Button };
  if ("customId" in node.props) {
    button.custom_id = node.props.customId;
  }
  if ("style" in node.props) {
    button.style = parseButtonStyle(node.props.style);
  }
  if ("label" in node.props) {
    button.label = node.props.label;
  } else {
    const label = readText(node.props.children);
    if (label) {
      button.label = label;
    }
  }
  if ("emoji" in node.props) {
    button.emoji = node.props.emoji;
  }
  if ("url" in node.props) {
    button.url = node.props.url;
  }
  if ("disabled" in node.props) {
    button.disabled = node.props.disabled;
  }
  if ("skuId" in node.props) {
    button.sku_id = node.props.skuId;
  }
  return button;
}

function parseSelectMenu(node: DiscordTsxElement): Record<string, unknown> {
  const select: Record<string, unknown> = { type: parseSelectType(node.tag) };
  if ("customId" in node.props) {
    select.custom_id = node.props.customId;
  }
  if ("placeholder" in node.props) {
    select.placeholder = node.props.placeholder;
  }
  if ("minValues" in node.props) {
    select.min_values = node.props.minValues;
  }
  if ("maxValues" in node.props) {
    select.max_values = node.props.maxValues;
  }
  if ("disabled" in node.props) {
    select.disabled = node.props.disabled;
  }
  if ("channelTypes" in node.props) {
    select.channel_types = node.props.channelTypes;
  }
  if ("defaultValues" in node.props) {
    select.default_values = node.props.defaultValues;
  }

  if (node.tag === "StringSelectMenu") {
    const fromProp = Array.isArray(node.props.options) ? (node.props.options as unknown[]) : [];
    const fromChildren = elementChildrenOf(node)
      .filter((entry) => entry.tag === "Option")
      .map(parseOption);
    const options = [...fromProp, ...fromChildren];
    select.options = options;
  }

  return select;
}

function parseTextDisplay(node: DiscordTsxElement | { props: { children?: unknown } }): Record<string, unknown> {
  return {
    type: COMPONENT_TYPE.TextDisplay,
    content: readText(node.props.children)
  };
}

function parseThumbnailComponent(node: DiscordTsxElement): Record<string, unknown> {
  const url = node.props.url ?? node.props.src ?? readText(node.props.children);
  const media: Record<string, unknown> = { url };
  if ("description" in node.props) {
    media.description = node.props.description;
  }
  if ("spoiler" in node.props) {
    media.spoiler = node.props.spoiler;
  }

  return {
    type: COMPONENT_TYPE.Thumbnail,
    media
  };
}

function parseSection(node: DiscordTsxElement): Record<string, unknown> {
  const textComponents: Record<string, unknown>[] = [];
  let accessory: Record<string, unknown> | undefined;

  for (const child of childrenOf(node)) {
    if (isDiscordTsxElement(child)) {
      if (child.tag === "SectionText") {
        for (const textNode of childrenOf(child)) {
          if (isDiscordTsxElement(textNode) && textNode.tag === "Text") {
            textComponents.push(parseTextDisplay(textNode));
            continue;
          }
          textComponents.push(parseTextDisplay({ props: { children: textNode } }));
        }
        continue;
      }

      if (child.tag === "SectionAccessory") {
        const accessoryChild = elementChildrenOf(child)[0];
        if (!accessoryChild) {
          continue;
        }
        if (accessoryChild.tag === "Button") {
          accessory = parseButton(accessoryChild);
          continue;
        }
        if (accessoryChild.tag === "Thumbnail") {
          accessory = parseThumbnailComponent(accessoryChild);
          continue;
        }
        throw new Error("<SectionAccessory> only supports <Button> or <Thumbnail>.");
      }

      if (child.tag === "Text") {
        textComponents.push(parseTextDisplay(child));
        continue;
      }
    }

    textComponents.push(parseTextDisplay({ props: { children: child } }));
  }

  if (textComponents.length === 0) {
    throw new Error("<Section> requires at least one text block.");
  }

  const section: Record<string, unknown> = {
    type: COMPONENT_TYPE.Section,
    components: textComponents
  };

  if (accessory !== undefined) {
    section.accessory = accessory;
  }

  return section;
}

function parseMediaItem(node: DiscordTsxElement): Record<string, unknown> {
  const media: Record<string, unknown> = {
    url: node.props.url ?? node.props.src ?? readText(node.props.children)
  };
  if ("description" in node.props) {
    media.description = node.props.description;
  }
  if ("spoiler" in node.props) {
    media.spoiler = node.props.spoiler;
  }

  return { media };
}

function parseMediaGallery(node: DiscordTsxElement): Record<string, unknown> {
  const itemsFromChildren = elementChildrenOf(node)
    .filter((child) => child.tag === "MediaItem")
    .map(parseMediaItem);
  const itemsFromProps = Array.isArray(node.props.items) ? (node.props.items as unknown[]) : [];
  return {
    type: COMPONENT_TYPE.MediaGallery,
    items: [...itemsFromProps, ...itemsFromChildren]
  };
}

function parseFile(node: DiscordTsxElement): Record<string, unknown> {
  return {
    type: COMPONENT_TYPE.File,
    file: {
      url: node.props.url ?? node.props.src ?? readText(node.props.children)
    }
  };
}

function parseSeparator(node: DiscordTsxElement): Record<string, unknown> {
  const separator: Record<string, unknown> = { type: COMPONENT_TYPE.Separator };
  if ("divider" in node.props) {
    separator.divider = node.props.divider;
  }
  if ("spacing" in node.props) {
    separator.spacing = node.props.spacing;
  }
  return separator;
}

function parseInteractive(node: DiscordTsxElement): Record<string, unknown> {
  if (node.tag === "Button") {
    return parseButton(node);
  }
  if (SELECT_TAGS.has(node.tag)) {
    return parseSelectMenu(node);
  }
  throw new Error(`Unsupported interactive component <${node.tag}>.`);
}

function toActionRow(component: Record<string, unknown>): Record<string, unknown> {
  return {
    type: COMPONENT_TYPE.ActionRow,
    components: [component]
  };
}

function parseActionRow(node: DiscordTsxElement): Record<string, unknown> {
  const children = elementChildrenOf(node).map((child) => {
    if (!INTERACTIVE_TAGS.has(child.tag)) {
      throw new Error(`<ActionRow> only supports interactive components. Received <${child.tag}>.`);
    }
    return parseInteractive(child);
  });

  const selectCount = children.filter((child) => {
    const type = child.type;
    return typeof type === "number" && type >= COMPONENT_TYPE.StringSelect && type <= COMPONENT_TYPE.ChannelSelect;
  }).length;

  if (selectCount > 0 && children.length !== 1) {
    throw new Error(
      "Select menus must own an entire <ActionRow>. Put the select as the only child of its action row."
    );
  }

  if (selectCount === 0 && children.length > 5) {
    throw new Error("Button <ActionRow> supports at most 5 buttons.");
  }

  return {
    type: COMPONENT_TYPE.ActionRow,
    components: children
  };
}

function parseContainer(node: DiscordTsxElement): Record<string, unknown> {
  const components: Record<string, unknown>[] = [];

  for (const child of elementChildrenOf(node)) {
    if (child.tag === "Text") {
      components.push(parseTextDisplay(child));
      continue;
    }
    if (child.tag === "Section") {
      components.push(parseSection(child));
      continue;
    }
    if (child.tag === "MediaGallery") {
      components.push(parseMediaGallery(child));
      continue;
    }
    if (child.tag === "File") {
      components.push(parseFile(child));
      continue;
    }
    if (child.tag === "Separator") {
      components.push(parseSeparator(child));
      continue;
    }
    if (child.tag === "ActionRow") {
      components.push(parseActionRow(child));
      continue;
    }
    if (INTERACTIVE_TAGS.has(child.tag)) {
      components.push(toActionRow(parseInteractive(child)));
      continue;
    }
    throw new Error(`Unsupported child <${child.tag}> inside <Container>.`);
  }

  const container: Record<string, unknown> = {
    type: COMPONENT_TYPE.Container,
    components
  };

  if ("accentColor" in node.props) {
    container.accent_color = colorToInt(node.props.accentColor);
  } else if ("accent_color" in node.props) {
    container.accent_color = colorToInt(node.props.accent_color);
  }
  if ("spoiler" in node.props) {
    container.spoiler = node.props.spoiler;
  }

  return container;
}

function parseTopLevelComponent(node: DiscordTsxElement): { component: Record<string, unknown>; usesV2: boolean } {
  if (node.tag === "ActionRow") {
    return { component: parseActionRow(node), usesV2: false };
  }
  if (node.tag === "Container") {
    return { component: parseContainer(node), usesV2: true };
  }
  if (node.tag === "Section") {
    return { component: parseSection(node), usesV2: true };
  }
  if (node.tag === "Text") {
    return { component: parseTextDisplay(node), usesV2: true };
  }
  if (node.tag === "Thumbnail") {
    return { component: parseThumbnailComponent(node), usesV2: true };
  }
  if (node.tag === "MediaGallery") {
    return { component: parseMediaGallery(node), usesV2: true };
  }
  if (node.tag === "File") {
    return { component: parseFile(node), usesV2: true };
  }
  if (node.tag === "Separator") {
    return { component: parseSeparator(node), usesV2: true };
  }
  if (INTERACTIVE_TAGS.has(node.tag)) {
    return { component: toActionRow(parseInteractive(node)), usesV2: true };
  }
  throw new Error(`Unsupported top-level component tag <${node.tag}>.`);
}

function parseComponents(root: DiscordTsxElement): DiscordComponentsPayload {
  const components: Record<string, unknown>[] = [];
  let usesV2 = false;

  for (const child of elementChildrenOf(root)) {
    const parsed = parseTopLevelComponent(child);
    components.push(parsed.component);
    usesV2 = usesV2 || parsed.usesV2;
  }

  return usesV2 ? { components, flags: MessageFlags.IsComponentsV2 } : { components };
}

export function renderDiscordEmbed(node: DiscordTsxNode): Record<string, unknown> {
  const root = assertElement(node, "DiscordEmbed");
  return parseEmbed(root);
}

export function renderDiscordComponents(node: DiscordTsxNode): DiscordComponentsPayload {
  const root = assertElement(node, "DiscordComponent");
  return parseComponents(root);
}

export function renderRoot(node: DiscordTsxNode): unknown {
  if (!isDiscordTsxElement(node)) {
    return node;
  }

  if (node.tag === "DiscordEmbed") {
    return renderDiscordEmbed(node);
  }

  if (node.tag === "DiscordComponent") {
    return renderDiscordComponents(node);
  }

  return node;
}
