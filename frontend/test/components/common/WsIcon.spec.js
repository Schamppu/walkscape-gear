import { mount } from "@vue/test-utils";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { nextTick } from "vue";

// Unmock WsIcon for this test file since we want to test the actual component
vi.unmock("@/components/primitives/WsIcon.vue");
import WsIcon from "@/components/primitives/WsIcon.vue";

// Mock the icon store
const mockIconStore = {
  loadIcon: vi.fn(),
};

// Mock the store composable
vi.mock("@/store/icon", () => ({
  useIconStore: () => mockIconStore,
}));

// Mock LoadingThrobber component
vi.mock("@/components/primitives/LoadingThrobber.vue", () => ({
  default: {
    name: "LoadingThrobber",
    template: '<div data-testid="loading-throbber">Loading...</div>',
  },
}));

describe("WsIcon", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders with correct default size", () => {
    mockIconStore.loadIcon.mockResolvedValue("mock-icon-url");

    const wrapper = mount(WsIcon, {
      props: {
        iconPath: "test-icon.png",
      },
    });

    const iconDiv = wrapper.find(".ws-icon");
    expect(iconDiv.attributes("style")).toContain("width: 32px");
    expect(iconDiv.attributes("style")).toContain("height: 32px");
    expect(iconDiv.attributes("style")).toContain("min-width: 32px");
    expect(iconDiv.attributes("style")).toContain("min-height: 32px");
  });

  test("renders with correct custom size", () => {
    mockIconStore.loadIcon.mockResolvedValue("mock-icon-url");

    const wrapper = mount(WsIcon, {
      props: {
        iconPath: "test-icon.png",
        size: "lg",
      },
    });

    const iconDiv = wrapper.find(".ws-icon");
    expect(iconDiv.attributes("style")).toContain("width: 48px");
    expect(iconDiv.attributes("style")).toContain("height: 48px");
  });

  test("validates size prop correctly", () => {
    const validSizes = [
      "xxxs",
      "xxs",
      "xs",
      "sm",
      "md",
      "lg",
      "xl",
      "xxl",
      "default",
    ];

    validSizes.forEach((size) => {
      expect(() => {
        mount(WsIcon, {
          props: {
            iconPath: "test-icon.png",
            size: size,
          },
        });
      }).not.toThrow();
    });
  });

  test("shows loading throbber initially", () => {
    // Mock loadIcon to not resolve immediately
    const loadIconPromise = new Promise(() => {}); // Never resolves
    mockIconStore.loadIcon.mockReturnValue(loadIconPromise);

    const wrapper = mount(WsIcon, {
      props: {
        iconPath: "test-icon.png",
      },
    });

    expect(wrapper.find('[data-testid="loading-throbber"]').exists()).toBe(
      true
    );
    expect(wrapper.find("img").exists()).toBe(false);
  });

  test("shows image after loading completes", async () => {
    const mockUrl = "https://example.com/icon.png";
    mockIconStore.loadIcon.mockResolvedValue(mockUrl);

    const wrapper = mount(WsIcon, {
      props: {
        iconPath: "test-icon.png",
        decorative: false,
      },
    });

    // Wait for the async operation to complete
    await nextTick();
    await nextTick();

    expect(wrapper.find('[data-testid="loading-throbber"]').exists()).toBe(
      false
    );

    const img = wrapper.find("img");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe(mockUrl);
    expect(img.attributes("alt")).toBe("Icon");
  });

  test("applies outline class when provided", async () => {
    const mockUrl = "https://example.com/icon.png";
    mockIconStore.loadIcon.mockResolvedValue(mockUrl);

    const wrapper = mount(WsIcon, {
      props: {
        iconPath: "test-icon.png",
        outlineClass: "border-red",
      },
    });

    await nextTick();
    await nextTick();

    const img = wrapper.find("img");
    expect(img.classes()).toContain("border-red");
  });

  test("does not apply outline class when not provided", async () => {
    const mockUrl = "https://example.com/icon.png";
    mockIconStore.loadIcon.mockResolvedValue(mockUrl);

    const wrapper = mount(WsIcon, {
      props: {
        iconPath: "test-icon.png",
      },
    });

    await nextTick();
    await nextTick();

    const img = wrapper.find("img");
    expect(img.attributes("class")).toBe("");
  });

  test("calls loadIcon when iconPath changes", async () => {
    mockIconStore.loadIcon.mockResolvedValue("mock-url");

    const wrapper = mount(WsIcon, {
      props: {
        iconPath: "icon1.png",
      },
    });

    expect(mockIconStore.loadIcon).toHaveBeenCalledWith("icon1.png");

    await wrapper.setProps({ iconPath: "icon2.png" });

    expect(mockIconStore.loadIcon).toHaveBeenCalledWith("icon2.png");
    expect(mockIconStore.loadIcon).toHaveBeenCalledTimes(2);
  });

  test("img has correct styling attributes", async () => {
    const mockUrl = "https://example.com/icon.png";
    mockIconStore.loadIcon.mockResolvedValue(mockUrl);

    const wrapper = mount(WsIcon, {
      props: {
        iconPath: "test-icon.png",
      },
    });

    await nextTick();
    await nextTick();

    const img = wrapper.find("img");
    expect(img.attributes("style")).toContain("width: 100%");
    expect(img.attributes("style")).toContain("height: 100%");
    expect(img.attributes("style")).toContain("object-fit: contain");
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
      mockIconStore.loadIcon.mockResolvedValue("mock-url");

      const wrapper = mount(WsIcon, {
        props: {
          iconPath: "test-icon.png",
          size: size,
        },
      });

      const iconDiv = wrapper.find(".ws-icon");
      expect(iconDiv.attributes("style")).toContain(`width: ${expected}`);
      expect(iconDiv.attributes("style")).toContain(`height: ${expected}`);
    });
  });

  test("shows loading state when iconPath changes", async () => {
    // First load
    mockIconStore.loadIcon.mockResolvedValueOnce("url1");

    const wrapper = mount(WsIcon, {
      props: {
        iconPath: "icon1.png",
      },
    });

    await nextTick();
    await nextTick();

    // Should show image, not loading
    expect(wrapper.find("img").exists()).toBe(true);
    expect(wrapper.find('[data-testid="loading-throbber"]').exists()).toBe(
      false
    );

    // Change icon (mock with pending promise)
    const pendingPromise = new Promise(() => {}); // Never resolves
    mockIconStore.loadIcon.mockReturnValue(pendingPromise);

    await wrapper.setProps({ iconPath: "icon2.png" });

    // Should show loading again
    expect(wrapper.find('[data-testid="loading-throbber"]').exists()).toBe(
      true
    );
  });

  test("has correct CSS classes and structure", () => {
    mockIconStore.loadIcon.mockResolvedValue("mock-url");

    const wrapper = mount(WsIcon, {
      props: {
        iconPath: "test-icon.png",
      },
    });

    const iconDiv = wrapper.find(".ws-icon");
    expect(iconDiv.exists()).toBe(true);
    expect(iconDiv.classes()).toContain("ws-icon");
  });

  test("handles iconStore loadIcon returning null", async () => {
    mockIconStore.loadIcon.mockResolvedValue(null);

    const wrapper = mount(WsIcon, {
      props: {
        iconPath: "test-icon.png",
      },
    });

    await nextTick();
    await nextTick();

    expect(wrapper.find('[data-testid="loading-throbber"]').exists()).toBe(
      false
    );
    expect(wrapper.find("img").exists()).toBe(false);
  });
});
