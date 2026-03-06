import type { Directive } from "vue";

type ClickOutsideElement = HTMLElement & {
  __clickOutsideHandler__?: (e: MouseEvent) => void;
  __escHandler__?: (e: KeyboardEvent) => void;
};

type ClickOutsideBinding =
  | (() => void)
  | {
      handler: () => void;
      esc?: boolean;
    };

const clickOutside: Directive<ClickOutsideElement, ClickOutsideBinding> = {
  mounted(el, binding) {
    const handler =
      typeof binding.value === "function"
        ? binding.value
        : binding.value.handler;

    const escEnabled =
      typeof binding.value === "object" ? binding.value.esc !== false : true;

    el.__clickOutsideHandler__ = (event: MouseEvent) => {
      if (!el.contains(event.target as Node)) {
        handler();
      }
    };

    // Defer so the click that triggered mounting this element doesn't
    // immediately fire the outside-click handler.
    requestAnimationFrame(() => {
      document.addEventListener("click", el.__clickOutsideHandler__!);
    });

    if (escEnabled) {
      el.__escHandler__ = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          handler();
        }
      };
      document.addEventListener("keydown", el.__escHandler__);
    }
  },

  unmounted(el) {
    if (el.__clickOutsideHandler__) {
      document.removeEventListener("click", el.__clickOutsideHandler__);
    }
    if (el.__escHandler__) {
      document.removeEventListener("keydown", el.__escHandler__);
    }

    delete el.__clickOutsideHandler__;
    delete el.__escHandler__;
  },
};

export default clickOutside;
