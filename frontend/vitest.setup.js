import { config } from "@vue/test-utils";
import { vi } from "vitest";

// Mock APIs that might not be available in happy-dom
config.global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

config.global.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock scrollTo if needed
config.global.scrollTo = vi.fn();

// Global component mocks
vi.mock("@/components/primitives/WsIcon.vue", () => ({
  default: {
    name: "WsIcon",
    props: ["iconPath", "size"],
    template: '<div data-testid="ws-icon" :data-icon-path="iconPath" :data-size="size">Icon</div>'
  }
}));

config.global.stubs = [];
