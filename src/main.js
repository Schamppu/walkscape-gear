import { createApp } from "vue";
import { createPinia } from 'pinia';
import App from "./App.vue";

// Import Element Plus and its CSS
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(ElementPlus);

app.mount("#app");
