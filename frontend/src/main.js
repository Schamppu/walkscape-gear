import { createApp } from "vue";
import { createPinia } from "pinia";
import directives from "@/directives";
import App from "./App.vue";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);

Object.entries(directives).forEach(([name, directive]) => {
  app.directive(name, directive);
});

app.mount("#app");
