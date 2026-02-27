export interface DiscordTagComponent<P = Record<string, unknown>> {
  (props: P & { children?: unknown }): unknown;
  readonly $$discordTag: string;
}

function createTag<P = Record<string, unknown>>(name: string): DiscordTagComponent<P> {
  const component = ((props: P & { children?: unknown }) => ({
    __discordTsxElement: true,
    tag: name,
    props
  })) as DiscordTagComponent<P>;

  Object.defineProperty(component, "$$discordTag", {
    value: name,
    enumerable: false,
    writable: false
  });

  return component;
}

export type TagName =
  | "DiscordEmbed"
  | "Title"
  | "Description"
  | "Url"
  | "Timestamp"
  | "Color"
  | "Author"
  | "AuthorName"
  | "AuthorIconUrl"
  | "AuthorUrl"
  | "Footer"
  | "FooterText"
  | "FooterIconUrl"
  | "Image"
  | "Thumbnail"
  | "Fields"
  | "Field"
  | "FieldName"
  | "FieldValue"
  | "DiscordComponent"
  | "ActionRow"
  | "Button"
  | "StringSelectMenu"
  | "UserSelectMenu"
  | "RoleSelectMenu"
  | "MentionableSelectMenu"
  | "ChannelSelectMenu"
  | "Option"
  | "Container"
  | "Text"
  | "Section"
  | "SectionText"
  | "SectionAccessory"
  | "MediaGallery"
  | "MediaItem"
  | "File"
  | "Separator";

export const DiscordEmbed = createTag("DiscordEmbed");
export const Title = createTag("Title");
export const Description = createTag("Description");
export const Url = createTag("Url");
export const Timestamp = createTag("Timestamp");
export const Color = createTag("Color");
export const Author = createTag("Author");
export const AuthorName = createTag("AuthorName");
export const AuthorIconUrl = createTag("AuthorIconUrl");
export const AuthorUrl = createTag("AuthorUrl");
export const Footer = createTag("Footer");
export const FooterText = createTag("FooterText");
export const FooterIconUrl = createTag("FooterIconUrl");
export const Image = createTag("Image");
export const Thumbnail = createTag("Thumbnail");
export const Fields = createTag("Fields");
export const Field = createTag("Field");
export const FieldName = createTag("FieldName");
export const FieldValue = createTag("FieldValue");

export const DiscordComponent = createTag("DiscordComponent");
export const ActionRow = createTag("ActionRow");
export const Button = createTag("Button");
export const StringSelectMenu = createTag("StringSelectMenu");
export const UserSelectMenu = createTag("UserSelectMenu");
export const RoleSelectMenu = createTag("RoleSelectMenu");
export const MentionableSelectMenu = createTag("MentionableSelectMenu");
export const ChannelSelectMenu = createTag("ChannelSelectMenu");
export const Option = createTag("Option");
export const Container = createTag("Container");
export const Text = createTag("Text");
export const Section = createTag("Section");
export const SectionText = createTag("SectionText");
export const SectionAccessory = createTag("SectionAccessory");
export const MediaGallery = createTag("MediaGallery");
export const MediaItem = createTag("MediaItem");
export const File = createTag("File");
export const Separator = createTag("Separator");
