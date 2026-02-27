export const rawEmbed = {
  color: 16777215,
  title: "Discord Tsx Builder Testing",
  description: "Hello World",
  fields: [
    { name: "Field 1", value: "Field 1 Value", inline: true },
    { name: "Field 2", value: "Field 2 Value", inline: true }
  ]
};

export const rawLegacyComponents = {
  components: [
    {
      type: 1,
      components: [
        {
          type: 2,
          custom_id: "button1",
          style: 2,
          label: "Click me"
        }
      ]
    },
    {
      type: 1,
      components: [
        {
          type: 3,
          custom_id: "select1",
          placeholder: "Pick one",
          options: [
            { label: "Option A", value: "a" },
            { label: "Option B", value: "b" }
          ]
        }
      ]
    }
  ]
};

export const rawV2Components = {
  components: [
    {
      type: 17,
      accent_color: 16777215,
      components: [
        {
          type: 10,
          content: "Here goes a TextDisplay"
        },
        {
          type: 1,
          components: [
            {
              type: 2,
              custom_id: "v2_button",
              style: 1,
              label: "Button inside container"
            }
          ]
        },
        {
          type: 9,
          components: [{ type: 10, content: "This is on the left" }],
          accessory: {
            type: 11,
            media: { url: "https://picsum.photos/160/160" }
          }
        }
      ]
    },
    { type: 10, content: "Also valid outside container" }
  ],
  flags: 32768
};
