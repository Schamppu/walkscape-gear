import { mount } from "@vue/test-utils";
import { describe, test, expect, beforeEach } from "vitest";
import WsButton from "@/components/primitives/WsButton.vue";

describe("WsButton", () => {
  describe("text only button", () => {
    let wrapper;

    beforeEach(() => {
      wrapper = mount(WsButton, {
        props: {
          text: "Click me",
        },
      });
    });

    test("renders button with text", () => {
      expect(wrapper.find("button").exists()).toBe(true);
      expect(wrapper.text()).toContain("Click me");
      expect(wrapper.find('[data-testid="ws-icon"]').exists()).toBe(false);
    });

    test("has correct CSS class", () => {
      expect(wrapper.find("button").classes()).toContain("button");
    });

    test("emits click event when clicked", async () => {
      await wrapper.find("button").trigger("click");

      expect(wrapper.emitted("click")).toBeTruthy();
      expect(wrapper.emitted("click")).toHaveLength(1);
    });

    test("passes event object to click emit", async () => {
      await wrapper.find("button").trigger("click");

      const emittedEvents = wrapper.emitted("click");
      expect(emittedEvents[0]).toHaveLength(1);
      expect(emittedEvents[0][0]).toBeInstanceOf(Event);
    });

    test("handles multiple clicks", async () => {
      const button = wrapper.find("button");

      await button.trigger("click");
      await button.trigger("click");
      await button.trigger("click");

      expect(wrapper.emitted("click")).toHaveLength(3);
    });
  });

  describe("icon and text button", () => {
    let wrapper;

    beforeEach(() => {
      wrapper = mount(WsButton, {
        props: {
          text: "Save",
          iconPath: "assets/icons/save.png",
        },
      });
    });

    test("renders both icon and text", () => {
      expect(wrapper.text()).toContain("Save");
      expect(wrapper.find('[data-testid="ws-icon"]').exists()).toBe(true);

      const icon = wrapper.find('[data-testid="ws-icon"]');
      expect(icon.attributes("data-icon-path")).toBe("assets/icons/save.png");
    });

    test("icon appears before text in DOM order", () => {
      const button = wrapper.find("button");
      const children = button.element.childNodes;

      // First child should be the icon component
      expect(children[0].getAttribute("data-testid")).toBe("ws-icon");
      // Text should come after
      expect(button.text()).toContain("Save");
    });

    test("uses default icon size when not specified", () => {
      const icon = wrapper.find('[data-testid="ws-icon"]');
      expect(icon.attributes("data-size")).toBe("sm");
    });
  });

  describe("icon size variations", () => {
    test("passes correct custom icon size to WsIcon", () => {
      const wrapper = mount(WsButton, {
        props: {
          iconPath: "assets/icons/test.png",
          iconSize: "lg",
        },
      });

      const icon = wrapper.find('[data-testid="ws-icon"]');
      expect(icon.attributes("data-size")).toBe("lg");
    });

    test("different icon sizes work correctly", () => {
      const sizes = ["xs", "sm", "md", "lg", "xl"];

      sizes.forEach((size) => {
        const wrapper = mount(WsButton, {
          props: {
            text: "Test",
            iconPath: "assets/icons/test.png",
            iconSize: size,
          },
        });

        const icon = wrapper.find('[data-testid="ws-icon"]');
        expect(icon.attributes("data-size")).toBe(size);
      });
    });
  });

  describe("edge cases", () => {
    test("renders button with icon only (no text)", () => {
      const wrapper = mount(WsButton, {
        props: {
          iconPath: "assets/icons/menu.png",
        },
      });

      expect(wrapper.find('[data-testid="ws-icon"]').exists()).toBe(true);
      expect(wrapper.text().trim()).toBe("Icon"); // Only the mocked icon content
    });

    test("renders without any props", () => {
      const wrapper = mount(WsButton);

      expect(wrapper.find("button").exists()).toBe(true);
      expect(wrapper.find('[data-testid="ws-icon"]').exists()).toBe(false);
    });

    test("renders without text prop", () => {
      const wrapper = mount(WsButton, {
        props: {
          iconPath: "assets/icons/test.png",
        },
      });

      expect(wrapper.find("button").exists()).toBe(true);
    });

    test("handles empty string text", () => {
      const wrapper = mount(WsButton, {
        props: {
          text: "",
        },
      });

      expect(wrapper.find("button").exists()).toBe(true);
      expect(wrapper.text()).toBe("");
    });

    test("handles empty string iconPath", () => {
      const wrapper = mount(WsButton, {
        props: {
          text: "Test",
          iconPath: "",
        },
      });

      // Empty iconPath should be falsy, so no icon should render
      expect(wrapper.find('[data-testid="ws-icon"]').exists()).toBe(false);
      expect(wrapper.text()).toContain("Test");
    });
  });

  describe("snapshots", () => {
    test("text only button", () => {
      const wrapper = mount(WsButton, {
        props: {
          text: "Save",
        },
      });

      expect(wrapper.html()).toMatchSnapshot();
    });

    test("icon and text button", () => {
      const wrapper = mount(WsButton, {
        props: {
          text: "Save",
          iconPath: "assets/icons/save.png",
          iconSize: "md",
        },
      });

      expect(wrapper.html()).toMatchSnapshot();
    });

    test("icon only button", () => {
      const wrapper = mount(WsButton, {
        props: {
          iconPath: "assets/icons/menu.png",
        },
      });

      expect(wrapper.html()).toMatchSnapshot();
    });
  });
});
