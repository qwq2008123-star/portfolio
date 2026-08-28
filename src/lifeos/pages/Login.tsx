import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useOS } from "../store/OSContext";
import { GradientButton } from "../components/ui";

// ─── 注册 / 登录（Demo：本地账户，数据存于浏览器） ───

export default function Login() {
  const { dispatch } = useOS();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (!email.includes("@") || password.length < 4) {
      setError(mode === "register" ? "请输入有效邮箱和至少 4 位密码" : "邮箱或密码格式不正确");
      return;
    }
    const displayName = name.trim() || email.split("@")[0];
    dispatch({ type: "login", email, name: displayName });
    navigate("/life-os/onboarding");
  };

  const quickStart = () => {
    dispatch({ type: "login", email: "demo@lifeos.ai", name: "体验者" });
    navigate("/life-os/onboarding");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-6 text-text-primary">
      {/* 背景光晕 */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-[#4E85BF]/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#89AACC]/10 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-md"
      >
        <div className="mb-10 text-center">
          <span className="accent-gradient mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl font-display text-xl italic text-bg">
            OS
          </span>
          <h1 className="font-display text-4xl italic leading-tight">
            AI Life OS
          </h1>
          <p className="mt-3 text-sm text-muted">
            不只是回答问题，而是真正理解你，并帮你创造更好的未来。
          </p>
        </div>

        <div className="rounded-3xl border border-stroke bg-surface/40 p-8 backdrop-blur-md">
          <div className="mb-6 flex gap-2">
            {(["register", "login"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-full px-4 py-2 text-sm transition-colors duration-300 ${
                  mode === m ? "bg-stroke/50 text-text-primary" : "text-muted hover:text-text-primary"
                }`}
              >
                {m === "register" ? "创建账户" : "登录"}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {mode === "register" && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="你的名字"
                className="w-full rounded-xl border border-stroke bg-bg px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted focus:border-[#89AACC]/50"
              />
            )}
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="邮箱地址"
              type="email"
              className="w-full rounded-xl border border-stroke bg-bg px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted focus:border-[#89AACC]/50"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密码（至少 4 位）"
              type="password"
              className="w-full rounded-xl border border-stroke bg-bg px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted focus:border-[#89AACC]/50"
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <GradientButton onClick={submit} className="w-full">
              {mode === "register" ? "开始构建我的 AI 伙伴" : "进入我的 Life OS"}
            </GradientButton>
          </div>

          <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted">
            <span className="h-px flex-1 bg-stroke" />
            或
            <span className="h-px flex-1 bg-stroke" />
          </div>

          <button
            onClick={quickStart}
            className="w-full rounded-full border border-stroke px-4 py-3 text-sm text-muted transition-colors duration-300 hover:text-text-primary"
          >
            一键体验 Demo
          </button>
        </div>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-muted">
          Demo 说明：所有数据仅存储在你的浏览器本地。
          <br />
          内置本地 AI 推理引擎，可通过环境变量接入真实 LLM。
        </p>
      </motion.div>
    </div>
  );
}
