import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useOS } from "../store/OSContext";
import type { UserProfile } from "../types";
import { GradientButton, Thinking } from "../components/ui";

// ─── 人格档案引导：多步问卷 → AI 生成画像 ───

const STEPS = ["基本信息", "性格特质", "经历与目标", "长期梦想"];
const MBTI_OPTIONS = ["INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP", "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP"];

export default function Onboarding() {
  const { state, dispatch, persona: currentPersona } = useOS();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [missing, setMissing] = useState<string[] | null>(null);

  const [form, setForm] = useState({
    name: state.account?.name ?? "",
    age: "",
    occupation: "",
    interests: "",
    personality: "",
    mbti: "",
    experiences: "",
    goals: "",
    dream: "",
  });

  const set = (k: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const canNext = () => {
    switch (step) {
      case 0:
        return form.name.trim().length > 0 && Number(form.age) > 0 && form.occupation.trim().length > 0;
      case 1:
        return form.mbti.length === 4 && form.personality.trim().length > 0;
      case 2:
        return form.goals.trim().length > 0;
      default:
        return true;
    }
  };

  // 当前步骤缺失的必填项（用于按钮点击时给出明确提示）
  const missingFields = (): string[] => {
    switch (step) {
      case 0:
        return [
          ...(form.name.trim() ? [] : ["名字"]),
          ...(Number(form.age) > 0 ? [] : ["年龄"]),
          ...(form.occupation.trim() ? [] : ["职业"]),
        ];
      case 1:
        return [
          ...(form.mbti.length === 4 ? [] : ["MBTI"]),
          ...(form.personality.trim() ? [] : ["性格特点"]),
        ];
      case 2:
        return form.goals.trim() ? [] : ["当前目标"];
      default:
        return [];
    }
  };

  // 步骤切换或输入变化时清除提示
  useEffect(() => {
    setMissing(null);
  }, [step, form.name, form.age, form.occupation, form.mbti, form.personality, form.goals]);

  const handleNext = () => {
    if (canNext()) {
      setStep((s) => s + 1);
    } else {
      setMissing(missingFields());
    }
  };

  const finish = () => {
    setAnalyzing(true);
    const now = Date.now();
    const profile: UserProfile = {
      name: form.name.trim(),
      age: Number(form.age) || 24,
      occupation: form.occupation.trim(),
      interests: form.interests.split(/[,，、\s]+/).filter(Boolean).slice(0, 6),
      personality: form.personality.trim(),
      mbti: form.mbti.toUpperCase(),
      experiences: form.experiences.trim(),
      goals: form.goals.trim(),
      dream: form.dream.trim(),
      createdAt: now,
      updatedAt: now,
    };
    // 模拟 AI 分析耗时后提交（人格模型由 derivePersona 实时推导）
    setTimeout(() => {
      dispatch({ type: "saveProfile", profile });
      setAnalyzing(false);
      navigate("/life-os");
    }, 2200);
  };

  if (analyzing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-6">
        <div className="w-full max-w-sm text-center">
          <Thinking text="AI 正在构建你的人格模型" />
          <p className="text-xs text-muted">
            正在融合你的性格、经历与目标，生成专属 AI 画像…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6 py-12 text-text-primary">
      <div className="w-full max-w-xl">
        {/* 步骤条 */}
        <div className="mb-10 flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 flex-col gap-2">
              <div className={`h-1 rounded-full transition-colors duration-500 ${i <= step ? "accent-gradient" : "bg-stroke/50"}`} />
              <span className={`text-[10px] uppercase tracking-widest ${i <= step ? "text-text-primary" : "text-muted"}`}>
                {label}
              </span>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <h1 className="mb-2 font-display text-3xl italic">{STEPS[step]}</h1>
            <p className="mb-8 text-sm text-muted">
              {step === 0 && "让 AI 先认识你是谁。"}
              {step === 1 && "你的性格是人格模型的骨架。"}
              {step === 2 && "经历塑造认知，目标决定方向。"}
              {step === 3 && "梦想是长期模拟的北极星。"}
            </p>

            <div className="space-y-5">
              {step === 0 && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="名字" required><input className={inputCls} value={form.name} onChange={(e) => set("name")(e.target.value)} placeholder="怎么称呼你" /></Field>
                    <Field label="年龄" required><input className={inputCls} value={form.age} onChange={(e) => set("age")(e.target.value.replace(/\D/g, ""))} placeholder="24" type="text" inputMode="numeric" /></Field>
                  </div>
                  <Field label="职业 / 专业" required><input className={inputCls} value={form.occupation} onChange={(e) => set("occupation")(e.target.value)} placeholder="例如：大三计算机专业 / 产品经理" /></Field>
                  <Field label="兴趣爱好（逗号分隔）"><input className={inputCls} value={form.interests} onChange={(e) => set("interests")(e.target.value)} placeholder="例如：编程, 写作, 健身" /></Field>
                </>
              )}

              {step === 1 && (
                <>
                  <Field label="MBTI 人格" required as="div">
                    <div className="flex flex-wrap gap-2">
                      {MBTI_OPTIONS.map((m) => (
                        <button
                          key={m}
                          onClick={() => set("mbti")(m)}
                          className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                            form.mbti === m ? "border-transparent bg-stroke/60 text-text-primary" : "border-stroke text-muted hover:text-text-primary"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="性格特点（越具体，画像越准）" required>
                    <textarea className={`${inputCls} min-h-24 resize-none`} value={form.personality} onChange={(e) => set("personality")(e.target.value)} placeholder="例如：好奇心强，喜欢尝试新事物，但容易焦虑，执行力一般…" />
                  </Field>
                </>
              )}

              {step === 2 && (
                <>
                  <Field label="重要人生经历（可选）">
                    <textarea className={`${inputCls} min-h-24 resize-none`} value={form.experiences} onChange={(e) => set("experiences")(e.target.value)} placeholder="例如：大二做过一个 App 拿了比赛奖；gap 过半年…" />
                  </Field>
                  <Field label="当前目标" required><input className={inputCls} value={form.goals} onChange={(e) => set("goals")(e.target.value)} placeholder="例如：成为 AI 工程师 / 考上目标院校" /></Field>
                </>
              )}

              {step === 3 && (
                <Field label="长期梦想（可选，但 AI 很想知道）">
                  <textarea className={`${inputCls} min-h-28 resize-none`} value={form.dream} onChange={(e) => set("dream")(e.target.value)} placeholder="例如：做出影响一百万人的产品，同时保持自由的生活…" />
                </Field>
              )}
            </div>

            <div className="mt-10 flex items-center justify-between">
              <button
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className={`text-sm text-muted transition-colors hover:text-text-primary ${step === 0 ? "invisible" : ""}`}
              >
                ← 上一步
              </button>
              {step < STEPS.length - 1 ? (
                <GradientButton onClick={handleNext}>
                  下一步
                </GradientButton>
              ) : (
                <GradientButton onClick={finish} disabled={analyzing}>
                  {currentPersona ? "更新人格模型" : "生成我的 AI 画像"}
                </GradientButton>
              )}
            </div>

            {missing && missing.length > 0 && (
              <p className="mt-4 text-right text-xs text-red-400">
                还需填写：{missing.join("、")}
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-stroke bg-surface/40 px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted focus:border-[#89AACC]/50";

function Field({
  label,
  required = false,
  as: Tag = "label",
  children,
}: {
  label: string;
  required?: boolean;
  /** 按钮组等非表单控件内容需用 div——label 内的按钮会被无障碍树忽略 */
  as?: "label" | "div";
  children: ReactNode;
}) {
  return (
    <Tag className="block">
      <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </span>
      {children}
    </Tag>
  );
}
