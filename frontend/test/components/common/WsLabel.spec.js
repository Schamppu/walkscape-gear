import { mount } from "@vue/test-utils";
import { describe, test, expect, beforeEach } from "vitest";
import WsLabel from "@/components/primitives/WsLabel.vue";

describe("WsLabel", () => {
  let wrapper;

  describe("without labelFor prop", () => {
    beforeEach(() => {
      wrapper = mount(WsLabel, {
        props: { label: "Test Label" },
      });
    });

    test("renders label text correctly", () => {
      expect(wrapper.text()).toBe("Test Label");
      expect(wrapper.find("label").exists()).toBe(true);
    });

    test("applies typography-label class", () => {
      expect(wrapper.find("label").classes()).toContain("typography-label");
    });

    test("renders", () => {
      const label = wrapper.find("label");
      expect(label.attributes("for")).toBeUndefined();
      expect(label.classes()).not.toContain("clickable");
    });

    test("does not apply clickable class", () => {
      expect(wrapper.find("label").classes()).not.toContain("clickable");
    });

    test("snapshot", () => {
      expect(wrapper.html()).toMatchSnapshot();
    });
  });

  describe("with labelFor prop", () => {
    beforeEach(() => {
      wrapper = mount(WsLabel, {
        props: {
          label: "Test Label",
          labelFor: "test-input",
        },
      });
    });

    test("renders", () => {
      const label = wrapper.find("label");
      expect(label.attributes("for")).toBe("test-input");
      expect(label.classes()).toContain("clickable");
    });

    test("applies clickable class", () => {
      expect(wrapper.find("label").classes()).toContain("clickable");
    });

    test("snapshot", () => {
      expect(wrapper.html()).toMatchSnapshot();
    });
  });
});
