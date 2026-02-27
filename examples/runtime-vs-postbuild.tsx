/* @jsxRuntime automatic */
/* @jsxImportSource discord-tsx */

import {
  ActionRow,
  Button,
  Container,
  Description,
  DiscordComponent,
  DiscordEmbed,
  Field,
  FieldName,
  FieldValue,
  Fields,
  Option,
  Section,
  SectionAccessory,
  SectionText,
  StringSelectMenu,
  Text,
  Thumbnail,
  Title
} from "discord-tsx";

const name = "World";

export const runtimeEmbed = (
  <DiscordEmbed color="#ffffff">
    <Title>Discord Tsx Builder Testing</Title>
    <Description>Hello {name}</Description>
    <Fields>
      <Field inline={true}>
        <FieldName>Field 1</FieldName>
        <FieldValue>Field 1 Value</FieldValue>
      </Field>
      <Field inline={true}>
        <FieldName>Field 2</FieldName>
        <FieldValue>Field 2 Value</FieldValue>
      </Field>
    </Fields>
  </DiscordEmbed>
);

export const runtimeLegacyComponents = (
  <DiscordComponent>
    <ActionRow>
      <Button customId="button1" style="secondary">
        Click me
      </Button>
    </ActionRow>
    <ActionRow>
      <StringSelectMenu customId="select1" placeholder="Pick one">
        <Option label="Option A" value="a" />
        <Option label="Option B" value="b" />
      </StringSelectMenu>
    </ActionRow>
  </DiscordComponent>
);

export const runtimeV2Components = (
  <DiscordComponent>
    <Container accentColor="#ffffff">
      <Text>Here goes a TextDisplay</Text>
      <Button customId="v2_button" style="primary">
        Button inside container
      </Button>
      <Section>
        <SectionText>This is on the left</SectionText>
        <SectionAccessory>
          <Thumbnail url="https://picsum.photos/160/160" />
        </SectionAccessory>
      </Section>
    </Container>
    <Text>Also valid outside container</Text>
  </DiscordComponent>
);
