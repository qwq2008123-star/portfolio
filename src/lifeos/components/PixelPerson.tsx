// ─── 星露谷物语风格像素小人 ───
// 16×12 像素网格，整数坐标 rect + crispEdges；站立待机动画由外层 CSS 控制。

export type PixelVariant = "mother" | "mentor" | "friend" | "child" | "future" | "user";

interface Sprite {
  hair: string;
  skin: string;
  top: string;
  bottom: string;
  /** 画在身体/脸后层的像素（长发、大衣侧摆…） */
  back: Array<[number, number, number, number, string]>;
  /** 画在最前层的像素（眼镜、帽子、领带、腮红…） */
  front: Array<[number, number, number, number, string]>;
}

const SPRITES: Record<PixelVariant, Sprite> = {
  mother: {
    hair: "#7A5230", skin: "#F8CFA0", top: "#C96F6F", bottom: "#5A3A3A",
    back: [
      [2, 2, 2, 8, "#7A5230"],   // 左侧长发
      [8, 2, 2, 8, "#7A5230"],   // 右侧长发
      [3, 1, 6, 3, "#7A5230"],   // 发顶
    ],
    front: [
      [3.2, 1.6, 5.6, 2, "#7A5230"],                    // 刘海
      [4, 6.8, 1, 1, "#F0A0A0"], [7, 6.8, 1, 1, "#F0A0A0"], // 腮红
    ],
  },
  mentor: {
    hair: "#2F2A26", skin: "#F3C9A5", top: "#2C3E5D", bottom: "#22283A",
    back: [],
    front: [
      [4, 1.6, 5.6, 1.8, "#2F2A26"],                    // 短发
      [4.6, 4.4, 1, 1.4, "#1B1E2B"], [7, 4.4, 1, 1.4, "#1B1E2B"], // 眼镜片
      [5.6, 4.9, 1, 0.5, "#1B1E2B"],                    // 镜桥
      [7, 9.2, 2, 3, "#EDEDE8"],                        // 衬衫
      [7.4, 10, 1.2, 1.8, "#B23B3B"],                   // 领带
    ],
  },
  friend: {
    hair: "#4A3421", skin: "#F8D8BD", top: "#D9A441", bottom: "#4A6FA5",
    back: [],
    front: [
      [3, 1, 6, 2.4, "#2E8B8B"],                        // 帽子
      [3, 3.2, 6, 0.8, "#247070"],                      // 帽檐
      [10.5, 3.2, 1.6, 0.8, "#247070"],                 // 反戴帽檐
      [4.2, 9.6, 0.7, 2.4, "#EDEDE8"], [7.1, 9.6, 0.7, 2.4, "#EDEDE8"], // 帽绳
    ],
  },
  child: {
    hair: "#E07B39", skin: "#FFE3CF", top: "#FFD166", bottom: "#6B9BD1",
    back: [],
    front: [
      [3.2, 1.8, 5.6, 1.6, "#E07B39"],                  // 蓬乱刘海
      [2.8, 2.4, 1, 1.4, "#E07B39"], [8.2, 2.4, 1, 1.4, "#E07B39"], // 翘发
      [7, 11.6, 2, 2, "#FFB347"],                       // T恤图案
    ],
  },
  future: {
    hair: "#C0C0C8", skin: "#F0C8A0", top: "#4A3B7C", bottom: "#3A2F5C",
    back: [
      [3, 9.5, 1, 5.5, "#3A2F5C"], [8, 9.5, 1, 5.5, "#3A2F5C"], // 大衣侧摆
    ],
    front: [
      [4, 1.4, 5.6, 2, "#C0C0C8"],                      // 银发
      [7, 9.2, 0.8, 4.8, "#3A2F5C"],                    // 大衣门襟
    ],
  },
  user: {
    hair: "#4A3421", skin: "#F8CFA0", top: "#4A78B5", bottom: "#3A4A5C",
    back: [],
    front: [
      [4, 1.4, 5.6, 1.8, "#4A3421"],                    // 农夫短发
      [7, 9.2, 2, 2.6, "#EDEDE8"],                      // 内搭
    ],
  },
};

export function PixelPerson({
  variant,
  size = 64,
  speaking = false,
  className = "",
}: {
  variant: PixelVariant;
  size?: number;
  speaking?: boolean;
  className?: string;
}) {
  const s = SPRITES[variant];
  const R = (x: number, y: number, w: number, h: number, fill: string, key?: string) => (
    <rect key={key ?? `${x}-${y}-${w}-${h}-${fill}`} x={x} y={y} width={w} height={h} fill={fill} />
  );

  const child = variant === "child";
  const scale = child ? 0.8 : variant === "future" ? 1.08 : 1;
  const off = child ? 2.6 : 0;

  return (
    <svg
      width={size}
      height={(size * 16) / 12}
      viewBox="0 0 12 16"
      shapeRendering="crispEdges"
      className={className}
      style={{ transform: `scale(${scale})`, transformOrigin: "center bottom" }}
    >
      {/* 影子 */}
      <ellipse cx="6" cy={15.4 - off} rx="3.4" ry="0.7" fill="rgba(0,0,0,0.45)" />
      <g transform={`translate(0 ${off})`}>
        {/* 后层 */}
        {s.back.map(([x, y, w, h, c], i) => R(x, y, w, h, c, `b${i}`))}
        {/* 腿 */}
        {R(4, 13, 1.6, 2.4, s.bottom)}
        {R(6.4, 13, 1.6, 2.4, s.bottom)}
        {/* 身体 */}
        {R(3, 8, 6, 5.5, s.top)}
        {/* 手臂 */}
        {R(2.2, 8.2, 1.1, 3.6, s.top)}
        {R(8.7, 8.2, 1.1, 3.6, s.top)}
        {/* 头 */}
        {R(3.5, 2.5, 5, 5.5, s.skin)}
        {/* 眼睛 + 嘴 */}
        {R(4.6, 4.6, 0.8, 1.1, "#26263B")}
        {R(6.9, 4.6, 0.8, 1.1, "#26263B")}
        {R(5.5, 6.4, 1, 0.5, "#B26B6B")}
        {/* 前层（刘海/帽子/眼镜…） */}
        {s.front.map(([x, y, w, h, c], i) => R(x, y, w, h, c, `f${i}`))}
      </g>
      {/* 发言光圈 */}
      {speaking && (
        <ellipse cx="6" cy={15.4 - off} rx="4.2" ry="1" fill="none" stroke="#E8C86A" strokeWidth="0.4" opacity="0.9" />
      )}
    </svg>
  );
}
