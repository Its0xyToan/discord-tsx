#!/usr/bin/env node
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import generateModule from "@babel/generator";
import traverseModule, { type NodePath } from "@babel/traverse";
import * as t from "@babel/types";

const traverseAst = (
  typeof traverseModule === "function"
    ? traverseModule
    : (traverseModule as unknown as { default: typeof traverseModule }).default
) as unknown as (parent: t.Node, opts?: Parameters<typeof import("@babel/traverse").default>[1]) => void;

const generateCode = (
  typeof generateModule === "function"
    ? generateModule
    : (generateModule as unknown as { default: typeof generateModule }).default
) as unknown as (
  ast: t.Node,
  opts?: Parameters<typeof import("@babel/generator").default>[1]
) => { code: string };

type PropsMap = Map<string, t.Expression>;

interface ParsedElement {
  tag: string;
  props: PropsMap;
}

interface TransformState {
  jsxCallees: Set<string>;
  tagLocals: Map<string, string>;
}

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

function hasDiscordRuntimeImport(source: string): boolean {
  return source === "discord-tsx-builder/jsx-runtime" || source.endsWith("/discord-tsx-builder/jsx-runtime");
}

function isJsxRuntimeSpecifier(specifier: t.ImportSpecifier): boolean {
  return (
    t.isIdentifier(specifier.imported) &&
    (specifier.imported.name === "jsx" || specifier.imported.name === "jsxs" || specifier.imported.name === "jsxDEV")
  );
}

function collectState(program: t.Program): TransformState {
  const jsxCallees = new Set<string>();
  const tagLocals = new Map<string, string>();

  for (const node of program.body) {
    if (!t.isImportDeclaration(node)) {
      continue;
    }

    if (node.source.value === "discord-tsx-builder") {
      for (const specifier of node.specifiers) {
        if (t.isImportSpecifier(specifier) && t.isIdentifier(specifier.imported)) {
          tagLocals.set(specifier.local.name, specifier.imported.name);
        }
      }
      continue;
    }

    if (!hasDiscordRuntimeImport(node.source.value)) {
      continue;
    }

    for (const specifier of node.specifiers) {
      if (!t.isImportSpecifier(specifier) || !t.isIdentifier(specifier.imported)) {
        continue;
      }
      if (specifier.imported.name === "jsx" || specifier.imported.name === "jsxs" || specifier.imported.name === "jsxDEV") {
        jsxCallees.add(specifier.local.name);
      }
    }
  }

  return { jsxCallees, tagLocals };
}

function cleanupDiscordRuntimeArtifacts(ast: t.File): void {
  const pragmaMatcher = /@jsxRuntime|@jsxImportSource/;
  const referencedNames = new Set<string>();

  traverseAst(ast, {
    Identifier(path) {
      if (path.isReferencedIdentifier()) {
        referencedNames.add(path.node.name);
      }
    }
  });

  traverseAst(ast, {
    ImportDeclaration(path) {
      if (!hasDiscordRuntimeImport(path.node.source.value)) {
        return;
      }

      const keptSpecifiers = path.node.specifiers.filter((specifier) => {
        if (!t.isImportSpecifier(specifier) || !isJsxRuntimeSpecifier(specifier)) {
          return true;
        }

        return referencedNames.has(specifier.local.name);
      });

      if (keptSpecifiers.length === 0) {
        path.remove();
        return;
      }

      path.node.specifiers = keptSpecifiers;
    }
  });

  ast.comments = (ast.comments ?? []).filter((comment) => !pragmaMatcher.test(comment.value));

  traverseAst(ast, {
    enter(path) {
      const node = path.node as t.Node & {
        leadingComments?: t.Comment[] | null;
        trailingComments?: t.Comment[] | null;
        innerComments?: t.Comment[] | null;
      };

      if (node.leadingComments) {
        node.leadingComments = node.leadingComments.filter((comment) => !pragmaMatcher.test(comment.value));
      }
      if (node.trailingComments) {
        node.trailingComments = node.trailingComments.filter((comment) => !pragmaMatcher.test(comment.value));
      }
      if (node.innerComments) {
        node.innerComments = node.innerComments.filter((comment) => !pragmaMatcher.test(comment.value));
      }
    }
  });
}

function expressionFromArrayElement(
  element: t.Expression | t.SpreadElement | t.ArgumentPlaceholder | null
): t.Expression | undefined {
  if (element === null || element === undefined || t.isArgumentPlaceholder(element) || t.isSpreadElement(element)) {
    return undefined;
  }
  return element;
}

function parsePropsObject(input: t.Expression | undefined): PropsMap | undefined {
  if (!input) {
    return new Map();
  }
  if (!t.isObjectExpression(input)) {
    return undefined;
  }

  const props = new Map<string, t.Expression>();
  for (const property of input.properties) {
    if (!t.isObjectProperty(property)) {
      return undefined;
    }
    if (!t.isIdentifier(property.key) && !t.isStringLiteral(property.key)) {
      return undefined;
    }
    if (!t.isExpression(property.value)) {
      return undefined;
    }

    const key = t.isIdentifier(property.key) ? property.key.name : property.key.value;
    props.set(key, property.value);
  }

  return props;
}

function resolveTagName(input: t.Expression, state: TransformState): string | undefined {
  if (t.isIdentifier(input)) {
    return state.tagLocals.get(input.name);
  }
  if (t.isStringLiteral(input)) {
    return input.value;
  }
  return undefined;
}

function parseElementExpression(input: t.Expression, state: TransformState): ParsedElement | undefined {
  if (!t.isCallExpression(input) || !t.isIdentifier(input.callee) || !state.jsxCallees.has(input.callee.name)) {
    return undefined;
  }

  const typeArg = input.arguments[0];
  const propsArg = input.arguments[1];
  if (!typeArg || !t.isExpression(typeArg)) {
    return undefined;
  }
  if (propsArg && !t.isExpression(propsArg)) {
    return undefined;
  }

  const tag = resolveTagName(typeArg, state);
  if (!tag) {
    return undefined;
  }

  const props = parsePropsObject(propsArg);
  if (!props) {
    return undefined;
  }

  return { tag, props };
}

function getChildren(props: PropsMap): t.Expression[] {
  const children = props.get("children");
  if (!children) {
    return [];
  }
  if (t.isArrayExpression(children)) {
    return children.elements
      .map((entry) => expressionFromArrayElement(entry))
      .filter((entry): entry is t.Expression => entry !== undefined);
  }
  return [children];
}

function textCoerce(expression: t.Expression): t.Expression {
  if (t.isStringLiteral(expression)) {
    return expression;
  }

  if (t.isNumericLiteral(expression)) {
    return t.stringLiteral(String(expression.value));
  }
  if (t.isBooleanLiteral(expression) || t.isNullLiteral(expression)) {
    return t.stringLiteral("");
  }

  const condition = t.logicalExpression(
    "||",
    t.binaryExpression("==", expression, t.nullLiteral()),
    t.logicalExpression(
      "||",
      t.binaryExpression("===", expression, t.booleanLiteral(false)),
      t.binaryExpression("===", expression, t.booleanLiteral(true))
    )
  );

  return t.conditionalExpression(condition, t.stringLiteral(""), t.callExpression(t.identifier("String"), [expression]));
}

function flattenTextParts(expression: t.Expression, state: TransformState): t.Expression[] {
  if (t.isArrayExpression(expression)) {
    return expression.elements.flatMap((entry) => {
      const nested = expressionFromArrayElement(entry);
      return nested ? flattenTextParts(nested, state) : [];
    });
  }

  const nestedElement = parseElementExpression(expression, state);
  if (nestedElement) {
    return getChildren(nestedElement.props).flatMap((child) => flattenTextParts(child, state));
  }

  if (t.isBooleanLiteral(expression) || t.isNullLiteral(expression)) {
    return [];
  }

  return [textCoerce(expression)];
}

function buildTextExpression(children: t.Expression[], state: TransformState): t.Expression {
  const parts = children.flatMap((child) => flattenTextParts(child, state));
  if (parts.length === 0) {
    return t.stringLiteral("");
  }

  return parts.slice(1).reduce<t.Expression>((acc, current) => t.binaryExpression("+", acc, current), parts[0]);
}

function parseColorExpression(input: t.Expression): t.Expression {
  if (!t.isStringLiteral(input)) {
    return input;
  }

  const hex = input.value.startsWith("#") ? input.value.slice(1) : input.value;
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
    return input;
  }

  return t.numericLiteral(Number.parseInt(hex, 16));
}

function parseButtonStyleExpression(input: t.Expression): t.Expression {
  if (!t.isStringLiteral(input)) {
    return input;
  }

  const mapped = BUTTON_STYLE[input.value.toLowerCase()];
  if (mapped === undefined) {
    return input;
  }
  return t.numericLiteral(mapped);
}

function pushProperty(target: t.ObjectExpression, key: string, value: t.Expression | undefined): void {
  if (!value) {
    return;
  }
  const keyNode = t.isValidIdentifier(key) ? t.identifier(key) : t.stringLiteral(key);
  target.properties.push(t.objectProperty(keyNode, value));
}

function parseField(element: ParsedElement, state: TransformState): t.ObjectExpression {
  const field = t.objectExpression([]);
  const children = getChildren(element.props);
  let nameValue = element.props.get("name");
  let fieldValue = element.props.get("value");

  for (const child of children) {
    const nested = parseElementExpression(child, state);
    if (!nested) {
      continue;
    }
    if (nested.tag === "FieldName") {
      nameValue = buildTextExpression(getChildren(nested.props), state);
    }
    if (nested.tag === "FieldValue") {
      fieldValue = buildTextExpression(getChildren(nested.props), state);
    }
  }

  if (!nameValue || !fieldValue) {
    throw new Error("<Field> must have both name and value.");
  }

  pushProperty(field, "name", nameValue);
  pushProperty(field, "value", fieldValue);
  pushProperty(field, "inline", element.props.get("inline"));
  return field;
}

function parseAuthor(element: ParsedElement, state: TransformState): t.ObjectExpression {
  const author = t.objectExpression([]);
  let name = element.props.get("name");
  let iconUrl = element.props.get("iconUrl") ?? element.props.get("icon_url");
  let url = element.props.get("url");

  for (const child of getChildren(element.props)) {
    const nested = parseElementExpression(child, state);
    if (!nested) {
      continue;
    }
    if (nested.tag === "AuthorName") {
      name = buildTextExpression(getChildren(nested.props), state);
    }
    if (nested.tag === "AuthorIconUrl") {
      iconUrl = buildTextExpression(getChildren(nested.props), state);
    }
    if (nested.tag === "AuthorUrl") {
      url = buildTextExpression(getChildren(nested.props), state);
    }
  }

  pushProperty(author, "name", name);
  pushProperty(author, "icon_url", iconUrl);
  pushProperty(author, "url", url);
  return author;
}

function parseFooter(element: ParsedElement, state: TransformState): t.ObjectExpression {
  const footer = t.objectExpression([]);
  let text = element.props.get("text");
  let iconUrl = element.props.get("iconUrl") ?? element.props.get("icon_url");

  for (const child of getChildren(element.props)) {
    const nested = parseElementExpression(child, state);
    if (!nested) {
      continue;
    }
    if (nested.tag === "FooterText") {
      text = buildTextExpression(getChildren(nested.props), state);
    }
    if (nested.tag === "FooterIconUrl") {
      iconUrl = buildTextExpression(getChildren(nested.props), state);
    }
  }

  pushProperty(footer, "text", text);
  pushProperty(footer, "icon_url", iconUrl);
  return footer;
}

function parseEmbedExpression(root: ParsedElement, state: TransformState): t.ObjectExpression {
  const embed = t.objectExpression([]);
  const fields: t.Expression[] = [];

  if (root.props.has("color")) {
    pushProperty(embed, "color", parseColorExpression(root.props.get("color")!));
  }

  for (const childExpression of getChildren(root.props)) {
    const child = parseElementExpression(childExpression, state);
    if (!child) {
      continue;
    }

    switch (child.tag) {
      case "Title":
        pushProperty(embed, "title", buildTextExpression(getChildren(child.props), state));
        break;
      case "Description":
        pushProperty(embed, "description", buildTextExpression(getChildren(child.props), state));
        break;
      case "Url":
        pushProperty(
          embed,
          "url",
          child.props.get("url") ?? buildTextExpression(getChildren(child.props), state)
        );
        break;
      case "Timestamp":
        pushProperty(
          embed,
          "timestamp",
          child.props.get("value") ?? buildTextExpression(getChildren(child.props), state)
        );
        break;
      case "Color":
        pushProperty(
          embed,
          "color",
          parseColorExpression(child.props.get("value") ?? buildTextExpression(getChildren(child.props), state))
        );
        break;
      case "Image":
        pushProperty(
          embed,
          "image",
          t.objectExpression([
            t.objectProperty(
              t.identifier("url"),
              child.props.get("url") ?? child.props.get("src") ?? buildTextExpression(getChildren(child.props), state)
            )
          ])
        );
        break;
      case "Thumbnail":
        pushProperty(
          embed,
          "thumbnail",
          t.objectExpression([
            t.objectProperty(
              t.identifier("url"),
              child.props.get("url") ?? child.props.get("src") ?? buildTextExpression(getChildren(child.props), state)
            )
          ])
        );
        break;
      case "Author":
        pushProperty(embed, "author", parseAuthor(child, state));
        break;
      case "Footer":
        pushProperty(embed, "footer", parseFooter(child, state));
        break;
      case "Fields":
        for (const fieldExpression of getChildren(child.props)) {
          const fieldElement = parseElementExpression(fieldExpression, state);
          if (fieldElement && fieldElement.tag === "Field") {
            fields.push(parseField(fieldElement, state));
          }
        }
        break;
      case "Field":
        fields.push(parseField(child, state));
        break;
      default:
        throw new Error(`Unsupported tag <${child.tag}> inside <DiscordEmbed> during postbuild.`);
    }
  }

  if (fields.length > 0) {
    pushProperty(embed, "fields", t.arrayExpression(fields));
  }

  return embed;
}

function parseSelectType(tag: string): number {
  switch (tag) {
    case "StringSelectMenu":
      return 3;
    case "UserSelectMenu":
      return 5;
    case "RoleSelectMenu":
      return 6;
    case "MentionableSelectMenu":
      return 7;
    case "ChannelSelectMenu":
      return 8;
    default:
      throw new Error(`Unsupported select menu <${tag}>.`);
  }
}

function parseOption(element: ParsedElement, state: TransformState): t.ObjectExpression {
  const option = t.objectExpression([]);
  const label = element.props.get("label") ?? buildTextExpression(getChildren(element.props), state);
  const value = element.props.get("value") ?? label;
  pushProperty(option, "label", label);
  pushProperty(option, "value", value);
  pushProperty(option, "description", element.props.get("description"));
  pushProperty(option, "emoji", element.props.get("emoji"));
  pushProperty(option, "default", element.props.get("default"));
  return option;
}

function parseButton(element: ParsedElement, state: TransformState): t.ObjectExpression {
  const button = t.objectExpression([t.objectProperty(t.identifier("type"), t.numericLiteral(2))]);
  pushProperty(button, "custom_id", element.props.get("customId"));
  pushProperty(button, "style", element.props.get("style") ? parseButtonStyleExpression(element.props.get("style")!) : undefined);
  const label = element.props.get("label") ?? buildTextExpression(getChildren(element.props), state);
  if (!t.isStringLiteral(label) || label.value !== "") {
    pushProperty(button, "label", label);
  }
  pushProperty(button, "emoji", element.props.get("emoji"));
  pushProperty(button, "url", element.props.get("url"));
  pushProperty(button, "disabled", element.props.get("disabled"));
  pushProperty(button, "sku_id", element.props.get("skuId"));
  return button;
}

function parseSelectMenu(element: ParsedElement, state: TransformState): t.ObjectExpression {
  const select = t.objectExpression([t.objectProperty(t.identifier("type"), t.numericLiteral(parseSelectType(element.tag)))]);
  pushProperty(select, "custom_id", element.props.get("customId"));
  pushProperty(select, "placeholder", element.props.get("placeholder"));
  pushProperty(select, "min_values", element.props.get("minValues"));
  pushProperty(select, "max_values", element.props.get("maxValues"));
  pushProperty(select, "disabled", element.props.get("disabled"));
  pushProperty(select, "channel_types", element.props.get("channelTypes"));
  pushProperty(select, "default_values", element.props.get("defaultValues"));

  if (element.tag === "StringSelectMenu") {
    const optionExpressions: t.Expression[] = [];
    const fromProp = element.props.get("options");
    if (fromProp && t.isArrayExpression(fromProp)) {
      optionExpressions.push(
        ...fromProp.elements
          .map((entry) => expressionFromArrayElement(entry))
          .filter((entry): entry is t.Expression => entry !== undefined)
      );
    }
    for (const child of getChildren(element.props)) {
      const optionElement = parseElementExpression(child, state);
      if (optionElement && optionElement.tag === "Option") {
        optionExpressions.push(parseOption(optionElement, state));
      }
    }
    pushProperty(select, "options", t.arrayExpression(optionExpressions));
  }

  return select;
}

function parseTextDisplay(element: ParsedElement, state: TransformState): t.ObjectExpression {
  return t.objectExpression([
    t.objectProperty(t.identifier("type"), t.numericLiteral(10)),
    t.objectProperty(t.identifier("content"), buildTextExpression(getChildren(element.props), state))
  ]);
}

function parseThumbnailComponent(element: ParsedElement, state: TransformState): t.ObjectExpression {
  return t.objectExpression([
    t.objectProperty(t.identifier("type"), t.numericLiteral(11)),
    t.objectProperty(
      t.identifier("media"),
      t.objectExpression([
        t.objectProperty(
          t.identifier("url"),
          element.props.get("url") ?? element.props.get("src") ?? buildTextExpression(getChildren(element.props), state)
        ),
        ...(element.props.get("description")
          ? [t.objectProperty(t.identifier("description"), element.props.get("description")!)]
          : []),
        ...(element.props.get("spoiler")
          ? [t.objectProperty(t.identifier("spoiler"), element.props.get("spoiler")!)]
          : [])
      ])
    )
  ]);
}

function parseSection(element: ParsedElement, state: TransformState): t.ObjectExpression {
  const textBlocks: t.Expression[] = [];
  let accessory: t.Expression | undefined;

  for (const child of getChildren(element.props)) {
    const nested = parseElementExpression(child, state);
    if (!nested) {
      textBlocks.push(
        t.objectExpression([
          t.objectProperty(t.identifier("type"), t.numericLiteral(10)),
          t.objectProperty(t.identifier("content"), buildTextExpression([child], state))
        ])
      );
      continue;
    }

    if (nested.tag === "Text") {
      textBlocks.push(parseTextDisplay(nested, state));
      continue;
    }

    if (nested.tag === "SectionText") {
      for (const sectionTextChild of getChildren(nested.props)) {
        const maybeText = parseElementExpression(sectionTextChild, state);
        if (maybeText && maybeText.tag === "Text") {
          textBlocks.push(parseTextDisplay(maybeText, state));
          continue;
        }
        textBlocks.push(
          t.objectExpression([
            t.objectProperty(t.identifier("type"), t.numericLiteral(10)),
            t.objectProperty(t.identifier("content"), buildTextExpression([sectionTextChild], state))
          ])
        );
      }
      continue;
    }

    if (nested.tag === "SectionAccessory") {
      const accessoryChildExpression = getChildren(nested.props)[0];
      if (!accessoryChildExpression) {
        continue;
      }
      const accessoryChild = parseElementExpression(accessoryChildExpression, state);
      if (!accessoryChild) {
        throw new Error("<SectionAccessory> requires <Button> or <Thumbnail> child.");
      }
      if (accessoryChild.tag === "Button") {
        accessory = parseButton(accessoryChild, state);
        continue;
      }
      if (accessoryChild.tag === "Thumbnail") {
        accessory = parseThumbnailComponent(accessoryChild, state);
        continue;
      }
      throw new Error("<SectionAccessory> supports only <Button> or <Thumbnail>.");
    }

    textBlocks.push(parseTextDisplay(nested, state));
  }

  if (textBlocks.length === 0) {
    throw new Error("<Section> requires at least one text block.");
  }

  const properties: t.ObjectProperty[] = [
    t.objectProperty(t.identifier("type"), t.numericLiteral(9)),
    t.objectProperty(t.identifier("components"), t.arrayExpression(textBlocks))
  ];
  if (accessory) {
    properties.push(t.objectProperty(t.identifier("accessory"), accessory));
  }
  return t.objectExpression(properties);
}

function parseMediaItem(element: ParsedElement, state: TransformState): t.ObjectExpression {
  const mediaProps: t.ObjectProperty[] = [
    t.objectProperty(
      t.identifier("url"),
      element.props.get("url") ?? element.props.get("src") ?? buildTextExpression(getChildren(element.props), state)
    )
  ];
  if (element.props.get("description")) {
    mediaProps.push(t.objectProperty(t.identifier("description"), element.props.get("description")!));
  }
  if (element.props.get("spoiler")) {
    mediaProps.push(t.objectProperty(t.identifier("spoiler"), element.props.get("spoiler")!));
  }
  return t.objectExpression([t.objectProperty(t.identifier("media"), t.objectExpression(mediaProps))]);
}

function parseMediaGallery(element: ParsedElement, state: TransformState): t.ObjectExpression {
  const items: t.Expression[] = [];

  const fromProp = element.props.get("items");
  if (fromProp && t.isArrayExpression(fromProp)) {
    items.push(
      ...fromProp.elements
        .map((entry) => expressionFromArrayElement(entry))
        .filter((entry): entry is t.Expression => entry !== undefined)
    );
  }

  for (const childExpression of getChildren(element.props)) {
    const child = parseElementExpression(childExpression, state);
    if (child?.tag === "MediaItem") {
      items.push(parseMediaItem(child, state));
    }
  }

  return t.objectExpression([
    t.objectProperty(t.identifier("type"), t.numericLiteral(12)),
    t.objectProperty(t.identifier("items"), t.arrayExpression(items))
  ]);
}

function parseFileComponent(element: ParsedElement, state: TransformState): t.ObjectExpression {
  return t.objectExpression([
    t.objectProperty(t.identifier("type"), t.numericLiteral(13)),
    t.objectProperty(
      t.identifier("file"),
      t.objectExpression([
        t.objectProperty(
          t.identifier("url"),
          element.props.get("url") ?? element.props.get("src") ?? buildTextExpression(getChildren(element.props), state)
        )
      ])
    )
  ]);
}

function parseSeparator(element: ParsedElement): t.ObjectExpression {
  const properties: t.ObjectProperty[] = [t.objectProperty(t.identifier("type"), t.numericLiteral(14))];
  if (element.props.get("divider")) {
    properties.push(t.objectProperty(t.identifier("divider"), element.props.get("divider")!));
  }
  if (element.props.get("spacing")) {
    properties.push(t.objectProperty(t.identifier("spacing"), element.props.get("spacing")!));
  }
  return t.objectExpression(properties);
}

function parseInteractive(element: ParsedElement, state: TransformState): t.ObjectExpression {
  if (element.tag === "Button") {
    return parseButton(element, state);
  }
  if (SELECT_TAGS.has(element.tag)) {
    return parseSelectMenu(element, state);
  }
  throw new Error(`Unsupported interactive component <${element.tag}>.`);
}

function wrapActionRow(component: t.Expression): t.ObjectExpression {
  return t.objectExpression([
    t.objectProperty(t.identifier("type"), t.numericLiteral(1)),
    t.objectProperty(t.identifier("components"), t.arrayExpression([component]))
  ]);
}

function parseActionRow(element: ParsedElement, state: TransformState): t.ObjectExpression {
  const components = getChildren(element.props).map((childExpression) => {
    const child = parseElementExpression(childExpression, state);
    if (!child || !INTERACTIVE_TAGS.has(child.tag)) {
      throw new Error("<ActionRow> accepts only interactive components.");
    }
    return parseInteractive(child, state);
  });

  const selectCount = components.filter((component) => {
    const typeProp = component.properties.find(
      (property): property is t.ObjectProperty =>
        t.isObjectProperty(property) && t.isIdentifier(property.key, { name: "type" })
    );
    return (
      typeProp &&
      t.isNumericLiteral(typeProp.value) &&
      typeProp.value.value >= 3 &&
      typeProp.value.value <= 8
    );
  }).length;

  if (selectCount > 0 && components.length !== 1) {
    throw new Error("Select menus must be the only child in their <ActionRow>.");
  }
  if (selectCount === 0 && components.length > 5) {
    throw new Error("Button <ActionRow> supports at most 5 buttons.");
  }

  return t.objectExpression([
    t.objectProperty(t.identifier("type"), t.numericLiteral(1)),
    t.objectProperty(t.identifier("components"), t.arrayExpression(components))
  ]);
}

function parseContainer(element: ParsedElement, state: TransformState): t.ObjectExpression {
  const components: t.Expression[] = [];

  for (const childExpression of getChildren(element.props)) {
    const child = parseElementExpression(childExpression, state);
    if (!child) {
      continue;
    }

    if (child.tag === "Text") {
      components.push(parseTextDisplay(child, state));
      continue;
    }
    if (child.tag === "Section") {
      components.push(parseSection(child, state));
      continue;
    }
    if (child.tag === "MediaGallery") {
      components.push(parseMediaGallery(child, state));
      continue;
    }
    if (child.tag === "File") {
      components.push(parseFileComponent(child, state));
      continue;
    }
    if (child.tag === "Separator") {
      components.push(parseSeparator(child));
      continue;
    }
    if (child.tag === "ActionRow") {
      components.push(parseActionRow(child, state));
      continue;
    }
    if (INTERACTIVE_TAGS.has(child.tag)) {
      components.push(wrapActionRow(parseInteractive(child, state)));
      continue;
    }
    throw new Error(`Unsupported child <${child.tag}> inside <Container>.`);
  }

  const containerProps: t.ObjectProperty[] = [
    t.objectProperty(t.identifier("type"), t.numericLiteral(17)),
    t.objectProperty(t.identifier("components"), t.arrayExpression(components))
  ];
  if (element.props.get("accentColor")) {
    containerProps.push(
      t.objectProperty(t.identifier("accent_color"), parseColorExpression(element.props.get("accentColor")!))
    );
  } else if (element.props.get("accent_color")) {
    containerProps.push(
      t.objectProperty(t.identifier("accent_color"), parseColorExpression(element.props.get("accent_color")!))
    );
  }
  if (element.props.get("spoiler")) {
    containerProps.push(t.objectProperty(t.identifier("spoiler"), element.props.get("spoiler")!));
  }

  return t.objectExpression(containerProps);
}

function parseTopLevelComponent(
  element: ParsedElement,
  state: TransformState
): { expression: t.Expression; usesV2: boolean } {
  if (element.tag === "ActionRow") {
    return { expression: parseActionRow(element, state), usesV2: false };
  }
  if (element.tag === "Container") {
    return { expression: parseContainer(element, state), usesV2: true };
  }
  if (element.tag === "Section") {
    return { expression: parseSection(element, state), usesV2: true };
  }
  if (element.tag === "Text") {
    return { expression: parseTextDisplay(element, state), usesV2: true };
  }
  if (element.tag === "Thumbnail") {
    return { expression: parseThumbnailComponent(element, state), usesV2: true };
  }
  if (element.tag === "MediaGallery") {
    return { expression: parseMediaGallery(element, state), usesV2: true };
  }
  if (element.tag === "File") {
    return { expression: parseFileComponent(element, state), usesV2: true };
  }
  if (element.tag === "Separator") {
    return { expression: parseSeparator(element), usesV2: true };
  }
  if (INTERACTIVE_TAGS.has(element.tag)) {
    return { expression: wrapActionRow(parseInteractive(element, state)), usesV2: true };
  }

  throw new Error(`Unsupported top-level component tag <${element.tag}>.`);
}

function parseComponentsExpression(root: ParsedElement, state: TransformState): t.ObjectExpression {
  const components: t.Expression[] = [];
  let usesV2 = false;

  for (const childExpression of getChildren(root.props)) {
    const child = parseElementExpression(childExpression, state);
    if (!child) {
      continue;
    }
    const parsed = parseTopLevelComponent(child, state);
    components.push(parsed.expression);
    usesV2 = usesV2 || parsed.usesV2;
  }

  const payload = t.objectExpression([
    t.objectProperty(t.identifier("components"), t.arrayExpression(components))
  ]);
  if (usesV2) {
    pushProperty(payload, "flags", t.numericLiteral(1 << 15));
  }
  return payload;
}

function transformFileContents(sourceCode: string, filePath: string): string {
  const ast = parse(sourceCode, {
    sourceType: "module",
    plugins: ["importAttributes"]
  });

  const state = collectState(ast.program);
  if (state.jsxCallees.size === 0) {
    return sourceCode;
  }

  traverseAst(ast, {
    CallExpression(path: NodePath<t.CallExpression>) {
      if (!t.isIdentifier(path.node.callee) || !state.jsxCallees.has(path.node.callee.name)) {
        return;
      }
      const parsed = parseElementExpression(path.node, state);
      if (!parsed) {
        return;
      }
      if (parsed.tag === "DiscordEmbed") {
        path.replaceWith(parseEmbedExpression(parsed, state));
        return;
      }
      if (parsed.tag === "DiscordComponent") {
        path.replaceWith(parseComponentsExpression(parsed, state));
      }
    }
  });

  cleanupDiscordRuntimeArtifacts(ast);

  const output = generateCode(ast, {
    retainLines: true,
    comments: true
  });

  return output.code;
}

async function getJavaScriptFiles(targetPath: string): Promise<string[]> {
  const resolved = path.resolve(targetPath);
  const info = await stat(resolved);
  if (info.isFile()) {
    return resolved.endsWith(".js") ? [resolved] : [];
  }

  const entries = await readdir(resolved, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const entryPath = path.join(resolved, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getJavaScriptFiles(entryPath)));
      continue;
    }
    if (entry.isFile() && entryPath.endsWith(".js")) {
      files.push(entryPath);
    }
  }
  return files;
}

export async function transformJavaScriptFile(filePath: string): Promise<boolean> {
  const source = await readFile(filePath, "utf8");
  const transformed = transformFileContents(source, filePath);
  if (transformed === source) {
    return false;
  }
  await writeFile(filePath, transformed, "utf8");
  return true;
}

export async function runPostbuild(targetPath: string): Promise<void> {
  const files = await getJavaScriptFiles(targetPath);
  let changed = 0;
  for (const filePath of files) {
    try {
      const didChange = await transformJavaScriptFile(filePath);
      if (didChange) {
        changed += 1;
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`postbuild transform failed for ${filePath}: ${reason}`);
    }
  }
  process.stdout.write(`[discord-tsx-builder] transformed ${changed}/${files.length} JavaScript files.\n`);
}

async function main(): Promise<void> {
  const targetPath = process.argv[2] ?? "./dist";
  await runPostbuild(targetPath);
}

const currentFilePath = fileURLToPath(import.meta.url);
const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : "";

if (entryPath === currentFilePath) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
