import type { FutureRoute, Horizon, Persona, UserProfile } from "../types";
import { clamp, createRng, hashString } from "./random";

// ─── AI 未来模拟器：基于人格 + 目标生成多条发展路线（非预测，而是帮助理解选择） ───

type Domain = "考研" | "创业" | "就业" | "换城市" | "技能" | "通用";

function detectDomain(q: string): Domain {
  if (/考研|读研|读博|升学|申研/.test(q)) return "考研";
  if (/创业|开公司|做产品|合伙|startup/i.test(q)) return "创业";
  if (/换工作|跳槽|找工作|求职|offer/i.test(q)) return "就业";
  if (/换城市|搬家|去.*发展|北漂|沪漂|出国/.test(q)) return "换城市";
  if (/学|技能|转行|课程|培训/.test(q)) return "技能";
  return "通用";
}

interface RouteSeed {
  name: string;
  summary: string;
  baseRate: number;
  career: Record<Horizon, string>;
  ability: Record<Horizon, string>;
  income: Record<Horizon, string>;
  risks: string[];
  problems: string[];
}

function seedsFor(domain: Domain, profile: UserProfile): RouteSeed[] {
  const isStudent = /学生|在读/.test(profile.occupation);
  switch (domain) {
    case "考研":
      return [
        {
          name: "路线 A · 考研深造",
          summary: "投入 1 年备考，进入更高学术平台，延迟 2-3 年进入职场。",
          baseRate: 42,
          career: {
            "3": isStudent ? "研究生在读，建立学术履历" : "硕士学历转型完成，进入目标行业",
            "5": "以更高起点进入核心岗位，同侪竞争门槛提高",
            "10": "专业纵深形成，具备专家型职业壁垒",
          },
          ability: {
            "3": "研究方法 + 专业理论显著提升",
            "5": "专业能力体系化，开始带新人",
            "10": "领域内形成个人方法论",
          },
          income: { "3": "≈ 0（投入期）", "5": "高于本科起点 30-60%", "10": "上限更高，增长稳定" },
          risks: ["备考期机会成本高", "结果不确定，可能二战", "学术与产业脱节的可能"],
          problems: ["长期孤独备考的动力管理", "年龄焦虑与同侪比较"],
        },
        {
          name: "路线 B · 直接就业",
          summary: "立即进入职场，用 3 年实战换取行业经验与现金流。",
          baseRate: 68,
          career: {
            "3": "完成 1-2 次内部跃迁，成为业务骨干",
            "5": "资深执行层，开始带小团队",
            "10": "管理线或专家线二选一，路径清晰",
          },
          ability: {
            "3": "实战能力快速提升，补齐协作短板",
            "5": "行业理解加深，形成职业口碑",
            "10": "行业资源与人脉复利显现",
          },
          income: { "3": "起薪水平，稳步上涨", "5": "较起点 +50-80%", "10": "资深水平，抗风险强" },
          risks: ["学历天花板在部分赛道显现", "早期岗位可能偏离目标方向"],
          problems: ["工作后考研精力被稀释", "需要主动争取成长性任务"],
        },
        {
          name: "路线 C · 边工作边准备",
          summary: "先就业保底，同步准备申请/考试，保留双轨选择权。",
          baseRate: 55,
          career: { "3": "职场起步 + 备考推进，双线并行", "5": "视结果选择继续深造或加速晋升", "10": "两条路径的期权价值兑现" },
          ability: { "3": "时间管理与抗压能力被极限拉伸", "5": "复合背景成为差异化优势", "10": "兼具实战与理论的双栖能力" },
          income: { "3": "有收入但增速慢", "5": "取决于选择的方向", "10": "复合型人才溢价" },
          risks: ["双线作战，身心消耗大", "两头都可能不聚焦"],
          problems: ["需要极强的自律系统", "容易被日常加班挤占备考时间"],
        },
      ];
    case "创业":
      return [
        {
          name: "路线 A · 全职创业",
          summary: "All-in 验证商业假设，高风险高上限。",
          baseRate: 32,
          career: { "3": "完成 0→1，存活则进入增长期", "5": "存活公司开始规模化或转型", "10": "少数跑出，多数带着经验再出发" },
          ability: { "3": "产品/销售/融资全能拉伸", "5": "商业判断力质变", "10": "行业认知进入头部梯队" },
          income: { "3": "不稳定，可能为负", "5": "存活则指数级", "10": "上限极高" },
          risks: ["现金流压力", "失败概率客观存在", "社交与家庭关系承压"],
          problems: ["早期找不到 PMF", "合伙人与股权问题"],
        },
        {
          name: "路线 B · 副业验证",
          summary: "保留主业，用业余时间验证需求，降低风险。",
          baseRate: 58,
          career: { "3": "副业 MRR 稳定或果断放弃", "5": "跑通则全职，未跑通则职场晋升", "10": "进可攻退可守" },
          ability: { "3": "最小化执行 + 用户对话能力", "5": "商业闭环思维成熟", "10": "投资人与创业者双重视野" },
          income: { "3": "主业 + 小额副业收入", "5": "副业可能反超主业", "10": "多元收入结构" },
          risks: ["精力分散，两边都平庸", "验证周期被拉长"],
          problems: ["下班后的自律挑战", "容易陷入「准备」而不发布"],
        },
        {
          name: "路线 C · 加入早期团队",
          summary: "以早期员工身份进入创业公司，用低风险学习创业。",
          baseRate: 64,
          career: { "3": "随公司成长获得杠杆晋升", "5": "期权兑现或带着经验再创业", "10": "创业认知完整，人脉就位" },
          ability: { "3": "近距离观察 0→1 全过程", "5": "独当一面的业务能力", "10": "具备再次创业的全部要素" },
          income: { "3": "薪资略降 + 期权", "5": "期权可能爆发", "10": "财务与认知双回报" },
          risks: ["公司失败则期权归零", "平台依赖，个人品牌弱"],
          problems: ["选错赛道的沉没成本", "早期公司管理混乱的消耗"],
        },
      ];
    case "就业":
      return [
        { name: "路线 A · 稳守现岗", summary: "在当前岗位深耕，等待内部机会。", baseRate: 70,
          career: { "3": "内部晋升或轮岗", "5": "成为团队核心", "10": "资深管理者" },
          ability: { "3": "专业深度加强", "5": "带团队与跨部门协作", "10": "组织级影响力" },
          income: { "3": "常规调薪", "5": "晋升跳跃", "10": "稳定高位" },
          risks: ["外部竞争力钝化", "行业下行时缺乏选择权"], problems: ["成长速度取决于平台", "容易陷入舒适区"] },
        { name: "路线 B · 主动跳槽", summary: "瞄准更高平台或薪资，承担适配风险。", baseRate: 60,
          career: { "3": "新平台站稳并放大优势", "5": "跳槽红利兑现，进入快车道", "10": "履历溢价明显" },
          ability: { "3": "新环境强制学习，能力刷新", "5": "多平台视野形成方法论", "10": "行业级人脉与口碑" },
          income: { "3": "涨幅 20-40%", "5": "连续跳槽累计翻倍可能", "10": "高于留守路线" },
          risks: ["新环境适配失败", "频繁跳槽的履历疑虑"], problems: ["试用期压力", "旧优势可能不被认可"] },
        { name: "路线 C · 跨界转型", summary: "借跳槽切换赛道，用时间换可能性。", baseRate: 45,
          career: { "3": "新赛道立足，职级可能回退", "5": "复合背景成为稀缺优势", "10": "跨界领导者画像" },
          ability: { "3": "从零构建新领域技能", "5": "双领域交叉创新", "10": "定义自己的岗位" },
          income: { "3": "短期下降", "5": "反超原路径", "10": "上限最高" },
          risks: ["转型初期收入与职级下降", "沉没成本心理负担"], problems: ["新人身份的心理落差", "学习曲线陡峭"] },
      ];
    default:
      return [
        { name: "路线 A · 激进推进", summary: "集中资源全力押注这个方向。", baseRate: 45,
          career: { "3": "该领域快速立足", "5": "形成专业壁垒", "10": "领域头部可能" },
          ability: { "3": "能力密度高速增长", "5": "方法论成熟", "10": "定义标准的人" },
          income: { "3": "投入大于回报", "5": "回报开始兑现", "10": "指数曲线" },
          risks: ["单点依赖风险", "判断错误的纠错成本高"], problems: ["孤独感与自我怀疑", "反馈周期长"] },
        { name: "路线 B · 稳健叠加", summary: "在不改变主线的前提下逐步加码。", baseRate: 66,
          career: { "3": "主线稳定 + 新方向起步", "5": "新方向贡献 30% 成长", "10": "双引擎结构" },
          ability: { "3": "渐进式学习", "5": "新旧能力开始复利", "10": "复合型专家" },
          income: { "3": "平稳", "5": "第二曲线启动", "10": "多元稳健" },
          risks: ["节奏慢，可能错过窗口", "需要长期耐心"], problems: ["优先级冲突", "容易被主线挤掉"] },
        { name: "路线 C · 小成本试错", summary: "用 30 天做最小实验，用数据决定去留。", baseRate: 72,
          career: { "3": "快速验证后聚焦", "5": "资源集中在被验证的方向", "10": "决策质量带来的复利" },
          ability: { "3": "实验设计与快速迭代能力", "5": "判断力显著提升", "10": "职业决策专家" },
          income: { "3": "几乎无损", "5": "视验证结果", "10": "风险调整后收益最优" },
          risks: ["实验设计不严谨会误导决策", "试错心态可能变成浅尝辄止"], problems: ["需要定义清晰的验证指标", "容易过早放弃"] },
      ];
  }
}

export function simulateFutures(
  question: string,
  profile: UserProfile,
  persona: Persona,
): FutureRoute[] {
  const domain = detectDomain(question);
  const rng = createRng(hashString(question + profile.mbti + persona.archetype));
  const traitMap = new Map(persona.traits.map((t) => [t.label, t.score]));

  return seedsFor(domain, profile).map((seed, i) => {
    // 人格条件化：学习力/执行力/抗压性/社交力影响成功率
    const learn = (traitMap.get("学习力") ?? 50) - 50;
    const exec = (traitMap.get("执行力") ?? 50) - 50;
    const stress = (traitMap.get("抗压性") ?? 50) - 50;
    const social = (traitMap.get("社交力") ?? 50) - 50;
    const bias =
      seed.name.includes("考研") || seed.name.includes("深造")
        ? learn * 0.25 + exec * 0.1
        : seed.name.includes("创业") || seed.name.includes("激进")
          ? exec * 0.22 + stress * 0.18 + social * 0.08
          : seed.name.includes("副业") || seed.name.includes("试错") || seed.name.includes("边")
            ? exec * 0.15 + learn * 0.1
            : stress * 0.12 + exec * 0.1;

    return {
      id: `${domain}-${i}`,
      name: seed.name,
      summary: seed.summary,
      successRate: clamp(Math.round(seed.baseRate + bias + rng.range(-4, 4)), 12, 92),
      years: {
        "3": { career: seed.career["3"], ability: seed.ability["3"], income: seed.income["3"] },
        "5": { career: seed.career["5"], ability: seed.ability["5"], income: seed.income["5"] },
        "10": { career: seed.career["10"], ability: seed.ability["10"], income: seed.income["10"] },
      },
      risks: seed.risks,
      problems: seed.problems,
    };
  });
}

export { detectDomain };
