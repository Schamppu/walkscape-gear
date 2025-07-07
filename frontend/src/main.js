import { createApp } from "vue";
import { createPinia } from "pinia";
import directives from "@/directives";
import App from "./App.vue";

const pinia = createPinia();

const app = createApp(App);
app.use(pinia);

Object.entries(directives).forEach(([name, directive]) => {
  app.directive(name, directive);
});

app.config.errorHandler = (err, vm, info) => {
  console.error("Vue error:", err);
  console.error("Component:", vm);
  console.error("Info:", info);
};

app.mount("#app");
