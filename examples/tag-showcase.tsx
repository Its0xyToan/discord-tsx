/* @jsxRuntime automatic */
/* @jsxImportSource discord-tsx */

import {
  ActionRow,
  Author,
  AuthorIconUrl,
  AuthorName,
  AuthorUrl,
  Button,
  ChannelSelectMenu,
  Color,
  Container,
  Description,
  DiscordComponent,
  DiscordEmbed,
  Field,
  FieldName,
  FieldValue,
  Fields,
  File,
  Footer,
  FooterIconUrl,
  FooterText,
  Image,
  MediaGallery,
  MediaItem,
  MentionableSelectMenu,
  Option,
  RoleSelectMenu,
  Section,
  SectionAccessory,
  SectionText,
  Separator,
  StringSelectMenu,
  Text,
  Thumbnail,
  Timestamp,
  Title,
  Url,
  UserSelectMenu
} from "discord-tsx";

const username = "World";

export const embedShowcase = (
  <DiscordEmbed color="#ffffff">
    <Title>Tag Showcase</Title>
    <Description>Hello {username}</Description>
    <Url>https://example.com/message</Url>
    <Timestamp>2026-02-27T12:00:00.000Z</Timestamp>
    <Color>#ffffff</Color>
    <Author>
      <AuthorName>discord-tsx</AuthorName>
      <AuthorIconUrl>https://picsum.photos/96/96</AuthorIconUrl>
      <AuthorUrl>https://github.com</AuthorUrl>
    </Author>
    <Footer>
      <FooterText>Footer text</FooterText>
      <FooterIconUrl>https://picsum.photos/64/64</FooterIconUrl>
    </Footer>
    <Image url="https://picsum.photos/640/320" />
    <Thumbnail url="https://picsum.photos/160/160" />
    <Fields>
      <Field inline={true}>
        <FieldName>Field 1</FieldName>
        <FieldValue>Field 1 Value</FieldValue>
      </Field>
      <Field name="Field 2" value="Field 2 Value" inline={true} />
    </Fields>
  </DiscordEmbed>
);

export const componentShowcase = (
  <DiscordComponent>
    <ActionRow>
      <Button customId="btn_primary" style="primary">
        Primary Button
      </Button>
      <Button customId="btn_secondary" style="secondary" label="Secondary Button" />
    </ActionRow>

    <ActionRow>
      <StringSelectMenu customId="string_select" placeholder="Pick one">
        <Option label="Option A" value="a" />
        <Option label="Option B" value="b" description="Second option" />
      </StringSelectMenu>
    </ActionRow>

    <ActionRow>
      <UserSelectMenu customId="user_select" minValues={1} maxValues={1} />
    </ActionRow>
    <ActionRow>
      <RoleSelectMenu customId="role_select" />
    </ActionRow>
    <ActionRow>
      <MentionableSelectMenu customId="mentionable_select" />
    </ActionRow>
    <ActionRow>
      <ChannelSelectMenu customId="channel_select" />
    </ActionRow>

    <Container accentColor="#ffffff">
      <Text>Container text block</Text>
      <Section>
        <SectionText>Section text content</SectionText>
        <SectionAccessory>
          <Thumbnail url="https://picsum.photos/120/120" />
        </SectionAccessory>
      </Section>
      <MediaGallery>
        <MediaItem url="https://picsum.photos/320/180" />
        <MediaItem url="https://picsum.photos/321/180" description="Another image" />
      </MediaGallery>
      <File url="https://example.com/file.png" />
      <Separator divider={true} spacing={2} />
    </Container>

    <Text>Top-level v2 text also works</Text>
  </DiscordComponent>
);
