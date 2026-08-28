import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";

// GitHub Pages 子路径部署（/portfolio/）时，路由 basename 跟随 vite base
// 本地开发（BASE_URL=/）时为空，行为不变
const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

// StrictMode is intentionally omitted: GSAP timelines / ScrollTrigger
// pinning misbehave under double-mounting in dev.
createRoot(document.getElementById("root")!).render(
  <BrowserRouter basename={basename}>
    <App />
  </BrowserRouter>,
);
