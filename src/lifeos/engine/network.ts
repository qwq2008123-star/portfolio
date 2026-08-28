import type { MatchCandidate, Persona, UserProfile } from "../types";
import { createRng, hashString } from "./random";

// ─── AI 人格生态网络：基于人格/目标/兴趣/经历/阶段的多维匹配 ───

const FIRST = ["林", "苏", "陈", "周", "许", "韩", "沈", "顾", "叶", "江"];
const SECOND = ["亦航", "知远", "沐橙", "砚秋", "望舒", "之然", "清越", "既白", "南乔", "时安"];
const ROLES = [
  "AI 方向研究生",
  "独立开发者",
  "产品经理",
  "设计主理人",
  "大四学生",
  "创业公司 CTO",
  "内容创作者",
  "数据分析师",
  "海外留学生",
  "连续创业者",
];
const ARCHETYPES = ["探索型创造者", "分析型思考者", "连接型行动派", "坚韧型长期主义者", "创造型建造者"];
const TYPES: MatchCandidate["type"][] = ["学习伙伴", "创业伙伴", "行业导师", "兴趣朋友"];

const REASON_TEMPLATES = {
  persona: (a: string) => `人格互补：你的「${a}」与对方的执行型特质形成推拉平衡`,
  goal: (g: string) => `目标同向：你们都在朝「${g.slice(0, 12)}」方向前进`,
  interest: (i: string) => `兴趣重叠：同样热爱「${i}」`,
  stage: () => `阶段相邻：对方比你早 1-2 年走过你现在所处的阶段`,
  gap: () => `能力互补：对方的长板恰好是你的待发展项`,
};

export function generateMatches(
  profile: UserProfile,
  persona: Persona,
): MatchCandidate[] {
  const rng = createRng(hashString(profile.name + profile.mbti + persona.archetype));
  const count = 8;
  const candidates: MatchCandidate[] = [];

  for (let i = 0; i < count; i++) {
    const name = `${rng.pick(FIRST)}${rng.pick(SECOND)}`;
    const role = rng.pick(ROLES);
    const type = rng.pick(TYPES);
    const reasons = rng.shuffle(Object.keys(REASON_TEMPLATES)).slice(0, 3).map((key) => {
      switch (key) {
        case "persona":
          return REASON_TEMPLATES.persona(persona.archetype);
        case "goal":
          return REASON_TEMPLATES.goal(profile.goals || profile.dream || "自我成长");
        case "interest": {
          const interest =
            profile.interests.length > 0
              ? rng.pick(profile.interests)
              : "长期主义";
          return REASON_TEMPLATES.interest(interest);
        }
        case "stage":
          return REASON_TEMPLATES.stage();
        default:
          return REASON_TEMPLATES.gap();
      }
    });

    const matchScore = Math.min(97, 62 + rng.range(0, 30) + (type === "学习伙伴" ? 3 : 0));

    candidates.push({
      id: `cand-${i}-${hashString(name)}`,
      name,
      role,
      archetype: rng.pick(ARCHETYPES),
      type,
      matchScore,
      reasons,
      connected: false,
    });
  }

  return candidates.sort((a, b) => b.matchScore - a.matchScore);
}
