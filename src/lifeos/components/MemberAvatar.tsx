// ─── 社区固定成员：9 个手绘扁平插画风头像（对应参考形象） ───

import type { ReactNode } from "react";

const OUTLINE = "#3A3A3A";
const SW = 0.9;

function Face({ skin }: { skin: string }) {
  return (
    <>
      <ellipse cx="32" cy="27" rx="12.5" ry="13.2" fill={skin} stroke={OUTLINE} strokeWidth={SW} />
      <path d="M24.2 22.6 Q26.4 21.5 28.6 22.4" stroke={OUTLINE} strokeWidth={SW} fill="none" strokeLinecap="round" />
      <path d="M35.4 22.4 Q37.6 21.5 39.8 22.6" stroke={OUTLINE} strokeWidth={SW} fill="none" strokeLinecap="round" />
      <g fill={OUTLINE}>
        <circle cx="27" cy="26.8" r="1.55" />
        <circle cx="37" cy="26.8" r="1.55" />
        <circle cx="27.5" cy="26.3" r="0.5" fill="#fff" />
        <circle cx="37.5" cy="26.3" r="0.5" fill="#fff" />
      </g>
      <path d="M31.6 29.5 Q33 31.4 31.6 32.2" stroke={OUTLINE} strokeWidth={SW} fill="none" strokeLinecap="round" />
      <path d="M29.2 34.2 Q32 36.6 34.8 34.2" stroke={OUTLINE} strokeWidth={SW + 0.1} fill="none" strokeLinecap="round" />
      <circle cx="23.4" cy="31" r="1.9" fill="#F87171" opacity="0.35" />
      <circle cx="40.6" cy="31" r="1.9" fill="#F87171" opacity="0.35" />
    </>
  );
}

export function MemberAvatar({ variant, size }: { variant: string; size: number }) {
  const bg = {
    beanie: "#D9D2F0", topknot: "#DCEFC8", braids: "#FDE3C2", spiky: "#CDD6E4",
    split: "#F5C6C6", scarf: "#C8E4F7", dreadlocks: "#C9D6BE", mohawk: "#E8C86A", curly: "#BFE3D9",
  }[variant] ?? "#E5E7EB";

  const shoulders = (fill: string, detail?: ReactNode) => (
    <>
      <path d="M7 66 Q13 48 25 46 L39 46 Q51 48 57 66 Z" fill={fill} stroke={OUTLINE} strokeWidth={SW} />
      {detail}
    </>
  );

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className="rounded-full">
      <circle cx="32" cy="32" r="32" fill={bg} />
      {variant === "beanie" && (
        <>
          {/* 蓝色卷发（帽檐下两侧） */}
          <path d="M17 30 Q15 22 20 17 Q18 28 20 36 L24 34 Q21 27 22 21 Z" fill="#A5C8E4" />
          <path d="M47 30 Q49 22 44 17 Q46 28 44 36 L40 34 Q43 27 42 21 Z" fill="#A5C8E4" />
          <Face skin="#FFDFC4" />
          {/* 黄色毛线帽 */}
          <path d="M18 24 Q18 9 32 8.5 Q46 9 46 24 L46 20 Q32 12 18 20 Z" fill="#F2C94C" stroke={OUTLINE} strokeWidth={SW} />
          <path d="M17.5 20 Q32 12.5 46.5 20 L46.5 23.5 Q32 16 17.5 23.5 Z" fill="#E8B93B" stroke={OUTLINE} strokeWidth={SW} />
          {shoulders("#8B7BC7")}
        </>
      )}
      {variant === "topknot" && (
        <>
          {/* 丸子头 */}
          <circle cx="32" cy="10" r="5.2" fill="#2F4A3C" stroke={OUTLINE} strokeWidth={SW} />
          <path d="M19.5 26 Q20 13.5 32 13 Q44 13.5 44.5 26 Q40 18.5 32 18.5 Q24 18.5 19.5 26 Z" fill="#2F4A3C" stroke={OUTLINE} strokeWidth={SW} />
          <Face skin="#F3C9A5" />
          {shoulders("#EDEDE8", (
            <g stroke="#4A5568" strokeWidth="1.6">
              <line x1="10" y1="54" x2="54" y2="54" />
              <line x1="8" y1="59" x2="56" y2="59" />
            </g>
          ))}
          <circle cx="21.8" cy="31.5" r="1" fill="#E8C86A" stroke={OUTLINE} strokeWidth={SW * 0.5} />
          <circle cx="42.2" cy="31.5" r="1" fill="#E8C86A" stroke={OUTLINE} strokeWidth={SW * 0.5} />
        </>
      )}
      {variant === "braids" && (
        <>
          {/* 红棕长辫（后层 + 两侧垂辫） */}
          <path d="M16 34 Q14 12 32 11 Q50 12 48 34 L48 44 Q44 48 40 45 L40 26 Z M24 26 L24 45 Q20 48 16 44 Z" fill="#A0522D" />
          <Face skin="#8D5524" />
          {/* 前层两侧辫子 */}
          <g fill="#A0522D" stroke={OUTLINE} strokeWidth={SW * 0.6}>
            <ellipse cx="19" cy="34" rx="2.4" ry="3" /><ellipse cx="19.4" cy="40" rx="2.3" ry="3" /><ellipse cx="19.8" cy="46" rx="2.2" ry="3" />
            <ellipse cx="45" cy="34" rx="2.4" ry="3" /><ellipse cx="44.6" cy="40" rx="2.3" ry="3" /><ellipse cx="44.2" cy="46" rx="2.2" ry="3" />
          </g>
          <path d="M18.5 22.5 Q32 13 45.5 22.5 Q38 17 32 17 Q26 17 18.5 22.5 Z" fill="#A0522D" />
          {shoulders("#D98E4A", (
            <g stroke="#B5713A" strokeWidth="1.2" fill="none" opacity="0.8">
              <path d="M12 55 Q18 52 24 55 T36 55 T48 55 T54 55" />
              <path d="M10 60 Q17 57 24 60 T38 60 T52 60" />
            </g>
          ))}
        </>
      )}
      {variant === "spiky" && (
        <>
          <Face skin="#F3C9A5" />
          {/* 白金刺头 */}
          <path d="M19 25 L22 13 L26 20 L31 10.5 L36 19 L41.5 12 L45 25 Q40 17 32 17 Q24 17 19 25 Z" fill="#E8E4DC" stroke={OUTLINE} strokeWidth={SW} />
          {shoulders("#5B7C99", (
            <>
              <path d="M25 46 L32 60 L39 46" fill="#F4F4F5" stroke={OUTLINE} strokeWidth={SW} />
              <line x1="41.5" y1="33" x2="41.5" y2="36.5" stroke={OUTLINE} strokeWidth={SW} />
              <line x1="40.2" y1="34.8" x2="42.8" y2="34.8" stroke={OUTLINE} strokeWidth={SW} />
            </>
          ))}
        </>
      )}
      {variant === "split" && (
        <>
          {/* 双色长发后层：左黄右紫 */}
          <path d="M16 34 Q14 12 32 11 Q50 12 48 34 L48 46 Q44 50 40 46 L40 24 L24 24 L24 46 Q20 50 16 46 Z" fill="#E9C46A" />
          <path d="M32 11 Q50 12 48 34 L48 46 Q44 50 40 46 L40 24 L32 23 Z" fill="#6D28D9" />
          <Face skin="#F8D8BD" />
          <path d="M18.5 26 Q19 12.5 32 12 Q45 12.5 45.5 26 L38 20 Q30 16.5 24 22 Z" fill="#E9C46A" />
          <path d="M32 12 Q45 12.5 45.5 26 L38.5 19.5 L32 12 Z" fill="#6D28D9" />
          {shoulders("#4A5568", (
            <>
              <path d="M25 46 Q32 53 39 46" fill="none" stroke={OUTLINE} strokeWidth={SW} />
              <line x1="28" y1="50" x2="28" y2="60" stroke={OUTLINE} strokeWidth={SW} strokeLinecap="round" />
              <line x1="36" y1="50" x2="36" y2="60" stroke={OUTLINE} strokeWidth={SW} strokeLinecap="round" />
            </>
          ))}
        </>
      )}
      {variant === "scarf" && (
        <>
          {/* 丸子 + 发带 */}
          <circle cx="38" cy="12" r="4.6" fill="#5B4636" stroke={OUTLINE} strokeWidth={SW} />
          <path d="M19.5 25 Q20 14 32 13.5 Q44 14 44.5 25 Q38 18.5 32 18.5 Q26 18.5 19.5 25 Z" fill="#3D2E22" stroke={OUTLINE} strokeWidth={SW} />
          <Face skin="#F8D8BD" />
          {/* 花纹发带 */}
          <path d="M18.5 22 Q32 12 45.5 22 L44.5 26 Q32 16.5 19.5 26 Z" fill="#C89B5A" stroke={OUTLINE} strokeWidth={SW} />
          <g fill="#8A6234">
            <circle cx="25" cy="21" r="0.8" /><circle cx="32" cy="18.6" r="0.8" /><circle cx="39" cy="21" r="0.8" />
          </g>
          {/* 丝巾结 */}
          <path d="M43 30 Q48 32 46 36 Q44 38 42 36 Z" fill="#C89B5A" stroke={OUTLINE} strokeWidth={SW * 0.7} />
          {shoulders("#CFE3F0", (
            <>
              <path d="M25 46 L29 46 L32 52 L35 46 L39 46" fill="#F4F4F5" stroke={OUTLINE} strokeWidth={SW} />
              <circle cx="32" cy="58" r="0.8" fill={OUTLINE} />
              <circle cx="44.5" cy="31" r="1" fill="#E8C86A" stroke={OUTLINE} strokeWidth={SW * 0.5} />
            </>
          ))}
        </>
      )}
      {variant === "dreadlocks" && (
        <>
          {/* 灰白脏辫后层 */}
          <g fill="#D6D3CD" stroke={OUTLINE} strokeWidth={SW * 0.6}>
            <rect x="14" y="22" width="4" height="26" rx="2" />
            <rect x="20" y="20" width="4" height="30" rx="2" />
            <rect x="40" y="20" width="4" height="30" rx="2" />
            <rect x="46" y="22" width="4" height="26" rx="2" />
          </g>
          <Face skin="#8D5524" />
          {/* 白色辫排 + 胡子 + 皱纹 */}
          <g fill="#D6D3CD" stroke={OUTLINE} strokeWidth={SW * 0.6}>
            <rect x="24" y="14" width="3.4" height="10" rx="1.7" />
            <rect x="29" y="12.5" width="3.4" height="11" rx="1.7" />
            <rect x="34" y="12.5" width="3.4" height="11" rx="1.7" />
            <rect x="39" y="14" width="3.4" height="10" rx="1.7" />
          </g>
          <path d="M26 35.5 Q32 33.5 38 35.5 L37 40 Q32 42.5 27 40 Z" fill="#D6D3CD" stroke={OUTLINE} strokeWidth={SW * 0.7} />
          <path d="M27 31 Q29.5 32.4 32 31.2 M32 31.2 Q34.5 32.4 37 31" stroke={OUTLINE} strokeWidth={SW * 0.8} fill="none" strokeLinecap="round" />
          <path d="M24 19.5 Q28 18 32 19 M32 19 Q36 18 40 19.5" stroke={OUTLINE} strokeWidth={SW * 0.7} fill="none" opacity="0.6" />
          {shoulders("#8A9A7B", (
            <>
              <path d="M13 50 Q18 46 24 45.5 L40 45.5 Q46 46 51 50 L53 66 L11 66 Z" fill="#6B7B5E" stroke={OUTLINE} strokeWidth={SW} />
              <path d="M25 46 L32 54 L39 46" fill="#F4F4F5" stroke={OUTLINE} strokeWidth={SW} />
            </>
          ))}
        </>
      )}
      {variant === "mohawk" && (
        <>
          {/* 两侧铲青 */}
          <path d="M19 27 Q19.5 18 25 15.5 L25 27 Z" fill="#C68642" />
          <path d="M45 27 Q44.5 18 39 15.5 L39 27 Z" fill="#C68642" />
          <Face skin="#F3C9A5" />
          {/* 粉橙莫霍克 */}
          <g stroke={OUTLINE} strokeWidth={SW * 0.7}>
            <path d="M23 24 L26 8 L29 22 Z" fill="#F47458" />
            <path d="M28 20.5 L32 5.5 L36 20 Z" fill="#F97B4F" />
            <path d="M35 21.5 L39.5 9 L41.5 24 Z" fill="#EC5F8C" />
          </g>
          {/* 眉钉 */}
          <line x1="40" y1="22.2" x2="42" y2="21.4" stroke={OUTLINE} strokeWidth={SW} />
          {/* 皮夹克 + 项圈 */}
          {shoulders("#2D3142", (
            <>
              <path d="M25 46 L32 58 L39 46" stroke={OUTLINE} strokeWidth={SW} fill="none" />
              <rect x="27" y="44.6" width="10" height="3.2" rx="1.6" fill="#1B1E2B" stroke={OUTLINE} strokeWidth={SW * 0.7} />
              <g fill="#C0C8D8">
                <circle cx="15" cy="55" r="0.9" /><circle cx="20" cy="52" r="0.9" /><circle cx="49" cy="55" r="0.9" /><circle cx="44" cy="52" r="0.9" />
              </g>
            </>
          ))}
        </>
      )}
      {variant === "curly" && (
        <>
          {/* 红棕大卷发 */}
          <g fill="#A6432D" stroke={OUTLINE} strokeWidth={SW * 0.6}>
            <circle cx="20" cy="22" r="6.5" /><circle cx="28" cy="15.5" r="7" /><circle cx="38" cy="15" r="7" />
            <circle cx="45" cy="21" r="6.5" /><circle cx="17" cy="30" r="5" /><circle cx="47" cy="30" r="5" />
            <circle cx="16.5" cy="38" r="4.4" /><circle cx="47.5" cy="38" r="4.4" />
          </g>
          <Face skin="#FFDFC4" />
          <path d="M19 23.5 Q22 15.5 32 15 Q42 15.5 45 23.5 Q38 18 32 18 Q26 18 19 23.5 Z" fill="#A6432D" />
          {shoulders("#C89B5A", (
            <g stroke="#8A6234" strokeWidth="1.1" opacity="0.85">
              <line x1="14" y1="50" x2="46" y2="66" />
              <line x1="10" y1="60" x2="42" y2="72" />
              <line x1="50" y1="50" x2="18" y2="66" />
              <line x1="54" y1="60" x2="22" y2="72" />
              <line x1="32" y1="46" x2="32" y2="66" stroke="#F4F4F5" strokeWidth="4" />
            </g>
          ))}
        </>
      )}
    </svg>
  );
}
