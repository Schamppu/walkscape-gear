import { mount } from "@vue/test-utils";
import { buildOptions } from "../testHelpers";
import { describe, test, expect, beforeEach } from "vitest";
import Activity from "@/components/Activity.vue";

describe("Activity", () => {
  let wrapper;
  let options;

  beforeEach(() => {
    options = buildOptions();
    wrapper = mount(Activity, options);
  });

  test("should render itself", () => {
    expect(wrapper.element).toMatchSnapshot();
  });
});
