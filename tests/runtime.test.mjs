import assert from "node:assert/strict";
import test from "node:test";

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
  StringSelectMenu,
  Text,
  Title
} from "../dist/index.js";
import { jsx, jsxs } from "../dist/jsx-runtime.js";

test("runtime: embed tree is converted to Discord embed object", () => {
  const name = "World";
  const embed = jsxs(DiscordEmbed, {
    color: "#ffffff",
    children: [
      jsx(Title, { children: "Discord Tsx Builder Testing" }),
      jsxs(Description, { children: ["Hello ", name] }),
      jsx(Fields, {
        children: jsx(Field, {
          inline: true,
          children: [
            jsx(FieldName, { children: "Field 1" }),
            jsx(FieldValue, { children: "Field 1 Value" })
          ]
        })
      })
    ]
  });

  assert.deepEqual(embed, {
    color: 16777215,
    title: "Discord Tsx Builder Testing",
    description: "Hello World",
    fields: [{ name: "Field 1", value: "Field 1 Value", inline: true }]
  });
});

test("runtime: legacy components remain action rows and no v2 flag", () => {
  const components = jsx(DiscordComponent, {
    children: [
      jsx(ActionRow, {
        children: jsx(Button, {
          customId: "button1",
          style: "secondary",
          label: "Click me"
        })
      }),
      jsx(ActionRow, {
        children: jsx(StringSelectMenu, {
          customId: "select1",
          children: jsx(Option, { label: "One", value: "1" })
        })
      })
    ]
  });

  assert.deepEqual(components, {
    components: [
      {
        type: 1,
        components: [{ type: 2, custom_id: "button1", style: 2, label: "Click me" }]
      },
      {
        type: 1,
        components: [{ type: 3, custom_id: "select1", options: [{ label: "One", value: "1" }] }]
      }
    ]
  });
});

test("runtime: v2 components set IsComponentsV2 flag", () => {
  const components = jsx(DiscordComponent, {
    children: jsx(Container, {
      accentColor: "#ffffff",
      children: jsx(Text, { children: "hello" })
    })
  });

  assert.deepEqual(components, {
    components: [
      {
        type: 17,
        accent_color: 16777215,
        components: [{ type: 10, content: "hello" }]
      }
    ],
    flags: 32768
  });
});

test("runtime: select menu must be only child in action row", () => {
  assert.throws(() => {
    jsx(DiscordComponent, {
      children: jsx(ActionRow, {
        children: [
          jsx(Button, { customId: "button1", style: "primary", label: "A" }),
          jsx(StringSelectMenu, { customId: "select1", options: [] })
        ]
      })
    });
  }, /Select menus must own an entire <ActionRow>/);
});
