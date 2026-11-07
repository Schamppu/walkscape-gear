import { mount } from "@vue/test-utils";
import { describe, test, expect, vi } from "vitest";

// Unmock WsIcon for this test file since we want to test the actual component
vi.unmock("@/components/primitives/WsIcon.vue");
import WsIcon from "@/components/primitives/WsIcon.vue";

// Mock LoadingThrobber component
vi.mock("@/components/primitives/LoadingThrobber.vue", () => ({
  default: {
    name: "LoadingThrobber",
    template: '<div data-testid="loading-throbber">Loading...</div>',
  },
}));

// The loader remembers loaded URLs for the whole session, so each test uses
// its own icon paths to start from the "not loaded yet" state.
let counter = 0;
const uniquePath = () => `test-icon-${++counter}.png`;

const throbber = (wrapper) => wrapper.find('[data-testid="loading-throbber"]');
const isHidden = (el) => el.attributes("style")?.includes("display: none");

describe("WsIcon", () => {
  test("renders with correct default size", () => {
    const wrapper = mount(WsIcon, { props: { iconPath: uniquePath() } });

    const iconDiv = wrapper.find(".ws-icon");
    expect(iconDiv.attributes("style")).toContain("width: 32px");
    expect(iconDiv.attributes("style")).toContain("height: 32px");
    expect(iconDiv.attributes("style")).toContain("min-width: 32px");
    expect(iconDiv.attributes("style")).toContain("min-height: 32px");
  });

  test("handles all size variants correctly", () => {
    const sizeTests = [
      { size: "xxxs", expected: "8px" },
      { size: "xxs", expected: "12px" },
      { size: "xs", expected: "16px" },
      { size: "sm", expected: "24px" },
      { size: "md", expected: "32px" },
      { size: "default", expected: "32px" },
      { size: "lg", expected: "48px" },
      { size: "xl", expected: "64px" },
      { size: "xxl", expected: "96px" },
    ];

    sizeTests.forEach(({ size, expected }) => {
      const wrapper = mount(WsIcon, { props: { iconPath: uniquePath(), size } });

      const iconDiv = wrapper.find(".ws-icon");
      expect(iconDiv.attributes("style")).toContain(`width: ${expected}`);
      expect(iconDiv.attributes("style")).toContain(`height: ${expected}`);
    });
  });

  test("points the image at the icon endpoint", () => {
    const wrapper = mount(WsIcon, { props: { iconPath: "items/ring.png" } });

    expect(wrapper.find("img").attributes("src")).toMatch(
      /\/api\/icons\/items\/ring\.png$/,
    );
  });

  test("shows the throbber and hides the image until it loads", async () => {
    const wrapper = mount(WsIcon, {
      props: { iconPath: uniquePath(), decorative: false },
    });

    expect(throbber(wrapper).exists()).toBe(true);
    expect(isHidden(wrapper.find("img"))).toBe(true);

    await wrapper.find("img").trigger("load");

    expect(throbber(wrapper).exists()).toBe(false);
    const img = wrapper.find("img");
    expect(isHidden(img)).toBeFalsy();
    expect(img.attributes("alt")).toBe("Icon");
  });

  test("skips the throbber for an icon already loaded this session", async () => {
    const path = uniquePath();
    const first = mount(WsIcon, { props: { iconPath: path } });
    await first.find("img").trigger("load");

    const second = mount(WsIcon, { props: { iconPath: path } });

    expect(throbber(second).exists()).toBe(false);
    expect(isHidden(second.find("img"))).toBeFalsy();
  });

  test("removes the image when it fails to load", async () => {
    const wrapper = mount(WsIcon, { props: { iconPath: uniquePath() } });

    await wrapper.find("img").trigger("error");

    expect(throbber(wrapper).exists()).toBe(false);
    expect(wrapper.find("img").exists()).toBe(false);
  });

  test("shows the loading state again when iconPath changes", async () => {
    const wrapper = mount(WsIcon, { props: { iconPath: uniquePath() } });
    await wrapper.find("img").trigger("load");
    expect(throbber(wrapper).exists()).toBe(false);

    const next = uniquePath();
    await wrapper.setProps({ iconPath: next });

    expect(throbber(wrapper).exists()).toBe(true);
    expect(wrapper.find("img").attributes("src")).toContain(next);
  });

  test("renders nothing inside when iconPath is empty", () => {
    const wrapper = mount(WsIcon, { props: { iconPath: null } });

    expect(throbber(wrapper).exists()).toBe(false);
    expect(wrapper.find("img").exists()).toBe(false);
  });

  test("applies outline and extra classes to the image", () => {
    const wrapper = mount(WsIcon, {
      props: {
        iconPath: uniquePath(),
        outlineClass: "border-red",
        extraClasses: ["gray"],
      },
    });

    const img = wrapper.find("img");
    expect(img.classes()).toContain("border-red");
    expect(img.classes()).toContain("gray");
  });

  test("img has correct styling attributes", () => {
    const wrapper = mount(WsIcon, { props: { iconPath: uniquePath() } });

    const style = wrapper.find("img").attributes("style");
    expect(style).toContain("width: 100%");
    expect(style).toContain("height: 100%");
    expect(style).toContain("object-fit: contain");
  });
});
