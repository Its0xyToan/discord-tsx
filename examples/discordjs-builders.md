# discord.js Builders Equivalent

This is the equivalent payload construction using `discord.js` builders.

```ts
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  EmbedBuilder,
  SectionBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder
} from "discord.js";

const embed = new EmbedBuilder()
  .setColor(0xffffff)
  .setTitle("Discord Tsx Builder Testing")
  .setDescription("Hello World")
  .addFields(
    { name: "Field 1", value: "Field 1 Value", inline: true },
    { name: "Field 2", value: "Field 2 Value", inline: true }
  )
  .toJSON();

const legacyComponents = [
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("button1").setStyle(ButtonStyle.Secondary).setLabel("Click me")
  ),
  new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("select1")
      .setPlaceholder("Pick one")
      .addOptions(
        new StringSelectMenuOptionBuilder().setLabel("Option A").setValue("a"),
        new StringSelectMenuOptionBuilder().setLabel("Option B").setValue("b")
      )
  )
].map((row) => row.toJSON());

const v2Components = [
  new ContainerBuilder()
    .setAccentColor(0xffffff)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent("Here goes a TextDisplay"))
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("v2_button").setStyle(ButtonStyle.Primary).setLabel("Button inside container")
      )
    )
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent("This is on the left"))
        .setThumbnailAccessory(new ThumbnailBuilder().setURL("https://picsum.photos/160/160"))
    )
    .toJSON(),
  new TextDisplayBuilder().setContent("Also valid outside container").toJSON()
];
```
