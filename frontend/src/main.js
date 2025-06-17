import { createApp } from "vue";
import { createPinia } from "pinia";
import directives from "@/directives";
import App from "./App.vue";

// Import Element Plus and its CSS
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(ElementPlus);

Object.entries(directives).forEach(([name, directive]) => {
  app.directive(name, directive);
});

app.mount("#app");
