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

export type ButtonStyleName = "primary" | "secondary" | "success" | "danger" | "link" | "premium";
export type ButtonStyle = ButtonStyleName | 1 | 2 | 3 | 4 | 5 | 6;

type EmptyProps = Record<never, never>;
type ColorInput = string | number;

export interface DiscordEmbedProps {
  color?: ColorInput;
}

export type TitleProps = EmptyProps;
export type DescriptionProps = EmptyProps;

export interface UrlProps {
  url?: string;
}

export interface TimestampProps {
  value?: string | number | Date;
}

export interface ColorProps {
  value?: ColorInput;
}

export interface AuthorProps {
  name?: string;
  iconUrl?: string;
  icon_url?: string;
  url?: string;
}

export type AuthorNameProps = EmptyProps;
export type AuthorIconUrlProps = EmptyProps;
export type AuthorUrlProps = EmptyProps;

export interface FooterProps {
  text?: string;
  iconUrl?: string;
  icon_url?: string;
}

export type FooterTextProps = EmptyProps;
export type FooterIconUrlProps = EmptyProps;

export interface ImageProps {
  url?: string;
}

export interface ThumbnailProps {
  url?: string;
  src?: string;
  description?: string;
  spoiler?: boolean;
}

export type FieldsProps = EmptyProps;

export interface FieldProps {
  name?: string;
  value?: string;
  inline?: boolean;
}

export type FieldNameProps = EmptyProps;
export type FieldValueProps = EmptyProps;

export type DiscordComponentProps = EmptyProps;

export type ActionRowProps = EmptyProps;

export interface ButtonSharedProps {
  label?: string;
  emoji?: unknown;
  disabled?: boolean;
}

export type LinkButtonProps = ButtonSharedProps & {
  style: "link" | 5;
  url: string;
  customId?: never;
  skuId?: never;
};

export type PremiumButtonProps = ButtonSharedProps & {
  style: "premium" | 6;
  skuId: string;
  customId?: never;
  url?: never;
};

export type NonLinkButtonProps = ButtonSharedProps & {
  style?: "primary" | "secondary" | "success" | "danger" | 1 | 2 | 3 | 4;
  customId: string;
  url?: never;
  skuId?: never;
};

export type ButtonProps = LinkButtonProps | PremiumButtonProps | NonLinkButtonProps;

export interface SelectMenuProps {
  customId?: string;
  placeholder?: string;
  minValues?: number;
  maxValues?: number;
  disabled?: boolean;
  defaultValues?: unknown[];
}

export interface StringSelectMenuProps extends SelectMenuProps {
  options?: unknown[];
}

export type UserSelectMenuProps = SelectMenuProps;
export type RoleSelectMenuProps = SelectMenuProps;
export type MentionableSelectMenuProps = SelectMenuProps;

export interface ChannelSelectMenuProps extends SelectMenuProps {
  channelTypes?: unknown[];
}

export interface OptionProps {
  label?: string;
  value?: string;
  description?: string;
  emoji?: unknown;
  default?: boolean;
}

export interface ContainerProps {
  accentColor?: ColorInput;
  accent_color?: ColorInput;
  spoiler?: boolean;
}

export type TextProps = EmptyProps;
export type SectionProps = EmptyProps;
export type SectionTextProps = EmptyProps;
export type SectionAccessoryProps = EmptyProps;

export interface MediaGalleryProps {
  items?: unknown[];
}

export interface MediaItemProps {
  url?: string;
  src?: string;
  description?: string;
  spoiler?: boolean;
}

export interface FileProps {
  url?: string;
  src?: string;
}

export interface SeparatorProps {
  divider?: boolean;
  spacing?: number;
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

export const DiscordEmbed = createTag<DiscordEmbedProps>("DiscordEmbed");
export const Title = createTag<TitleProps>("Title");
export const Description = createTag<DescriptionProps>("Description");
export const Url = createTag<UrlProps>("Url");
export const Timestamp = createTag<TimestampProps>("Timestamp");
export const Color = createTag<ColorProps>("Color");
export const Author = createTag<AuthorProps>("Author");
export const AuthorName = createTag<AuthorNameProps>("AuthorName");
export const AuthorIconUrl = createTag<AuthorIconUrlProps>("AuthorIconUrl");
export const AuthorUrl = createTag<AuthorUrlProps>("AuthorUrl");
export const Footer = createTag<FooterProps>("Footer");
export const FooterText = createTag<FooterTextProps>("FooterText");
export const FooterIconUrl = createTag<FooterIconUrlProps>("FooterIconUrl");
export const Image = createTag<ImageProps>("Image");
export const Thumbnail = createTag<ThumbnailProps>("Thumbnail");
export const Fields = createTag<FieldsProps>("Fields");
export const Field = createTag<FieldProps>("Field");
export const FieldName = createTag<FieldNameProps>("FieldName");
export const FieldValue = createTag<FieldValueProps>("FieldValue");

export const DiscordComponent = createTag<DiscordComponentProps>("DiscordComponent");
export const ActionRow = createTag<ActionRowProps>("ActionRow");
export const Button = createTag<ButtonProps>("Button");
export const StringSelectMenu = createTag<StringSelectMenuProps>("StringSelectMenu");
export const UserSelectMenu = createTag<UserSelectMenuProps>("UserSelectMenu");
export const RoleSelectMenu = createTag<RoleSelectMenuProps>("RoleSelectMenu");
export const MentionableSelectMenu = createTag<MentionableSelectMenuProps>("MentionableSelectMenu");
export const ChannelSelectMenu = createTag<ChannelSelectMenuProps>("ChannelSelectMenu");
export const Option = createTag<OptionProps>("Option");
export const Container = createTag<ContainerProps>("Container");
export const Text = createTag<TextProps>("Text");
export const Section = createTag<SectionProps>("Section");
export const SectionText = createTag<SectionTextProps>("SectionText");
export const SectionAccessory = createTag<SectionAccessoryProps>("SectionAccessory");
export const MediaGallery = createTag<MediaGalleryProps>("MediaGallery");
export const MediaItem = createTag<MediaItemProps>("MediaItem");
export const File = createTag<FileProps>("File");
export const Separator = createTag<SeparatorProps>("Separator");
