import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { defineComponent, h, nextTick, ref, withDirectives } from "vue";
import { mount } from "@vue/test-utils";
import clickOutside from "@/directives/clickOutside";

// The directive attaches its document listener on the next animation frame.
const flushFrame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));

describe("v-click-outside", () => {
  let handler: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    handler = vi.fn();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  const mountWithRemovableButton = () => {
    const showButton = ref(true);
    const Comp = defineComponent({
      setup: () => () =>
        withDirectives(
          h("div", { class: "inside" }, [
            showButton.value
              ? h("button", { class: "remove", onClick: () => (showButton.value = false) })
              : null,
          ]),
          [[clickOutside, handler]],
        ),
    });
    return mount(Comp, { attachTo: document.body });
  };

  it("calls the handler for a click outside the element", async () => {
    mountWithRemovableButton();
    await flushFrame();

    document.body.click();

    expect(handler).toHaveBeenCalledOnce();
  });

  it("ignores a click inside the element", async () => {
    const wrapper = mountWithRemovableButton();
    await flushFrame();

    (wrapper.element as HTMLElement).click();

    expect(handler).not.toHaveBeenCalled();
  });

  it("ignores a click on an inside element that its own click handler removes", async () => {
    const wrapper = mountWithRemovableButton();
    await flushFrame();
    const button = wrapper.find(".remove").element as HTMLButtonElement;

    // Simulate the button being removed before the document listener runs.
    button.addEventListener("click", () => button.remove());
    button.click();
    await nextTick();

    expect(handler).not.toHaveBeenCalled();
  });
});
