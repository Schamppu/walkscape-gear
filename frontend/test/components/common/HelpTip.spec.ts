import { mount } from "@vue/test-utils";
import { describe, it, expect, afterEach } from "vitest";
import HelpTip from "@/components/common/HelpTip.vue";
import clickOutside from "@/directives/clickOutside";

const mountTip = () =>
  mount(HelpTip, {
    props: { text: "Explains the setting", label: "Setting" },
    global: { directives: { clickOutside } },
    attachTo: document.body,
  });

const tooltipVisible = (wrapper: ReturnType<typeof mountTip>) =>
  (wrapper.find('[role="tooltip"]').element as HTMLElement).style.display !== "none";

describe("HelpTip", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("is hidden until needed and linked to its button", () => {
    const wrapper = mountTip();
    const button = wrapper.find("button");
    const tooltip = wrapper.find('[role="tooltip"]');
    expect(tooltipVisible(wrapper)).toBe(false);
    expect(button.attributes("aria-describedby")).toBe(tooltip.attributes("id"));
    expect(button.attributes("aria-label")).toBe("Help: Setting");
    expect(tooltip.text()).toBe("Explains the setting");
  });

  it("shows on hover and keyboard focus", async () => {
    const wrapper = mountTip();
    await wrapper.trigger("mouseenter");
    expect(tooltipVisible(wrapper)).toBe(true);
    await wrapper.trigger("mouseleave");
    expect(tooltipVisible(wrapper)).toBe(false);

    await wrapper.find("button").trigger("focus");
    expect(tooltipVisible(wrapper)).toBe(true);
  });

  it("toggles on tap and closes on Escape", async () => {
    const wrapper = mountTip();
    const button = wrapper.find("button");
    await button.trigger("click");
    expect(tooltipVisible(wrapper)).toBe(true);
    expect(button.attributes("aria-expanded")).toBe("true");

    await button.trigger("keydown", { key: "Escape" });
    expect(tooltipVisible(wrapper)).toBe(false);
  });
});
