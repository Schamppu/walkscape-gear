import { createTestingPinia } from '@pinia/testing';

export const buildOptions = () => {
  return {
    global: {
      plugins: [createTestingPinia()],
    },
  }
}