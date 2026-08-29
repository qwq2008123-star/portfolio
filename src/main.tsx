import { createRoot } from "react-dom/client";
import { Component, type ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";

// 页面背景是纯黑的，一旦渲染崩溃用户只会看到"一片黑"。
// 这个边界把错误显示出来，方便定位。
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ color: "#fff", padding: 40, fontFamily: "monospace", maxWidth: 720, margin: "0 auto" }}>
          <h2 style={{ marginBottom: 12 }}>页面渲染出错了</h2>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "#f87171" }}>{String(this.state.error)}</pre>
          <p style={{ fontSize: 13, color: "#9ca3af" }}>
            建议：① 关闭本页的 Chrome 自动翻译后硬刷新（Cmd+Shift+R）　② 清除站点缓存
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

// GitHub Pages 子路径部署（/portfolio/）时，路由 basename 跟随 vite base
// 本地开发（BASE_URL=/）时为空，行为不变
const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

// StrictMode is intentionally omitted: GSAP timelines / ScrollTrigger
// pinning misbehave under double-mounting in dev.
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </ErrorBoundary>,
);
