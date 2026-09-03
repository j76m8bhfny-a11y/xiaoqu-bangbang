// 勋章图片批量生成脚本（调用 Gemini 图像模型，OpenAI 兼容代理）
// 用法：GEMINI_BASE_URL=http://127.0.0.1:8045 GEMINI_API_KEY=xxx node scripts/gen-badges.mjs
// 输出：src/assets/badges/{code}.jpg（生成后需 sips 压缩，见脚本末尾提示）
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BASE = process.env.GEMINI_BASE_URL || 'http://127.0.0.1:8045';
const KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';
if (!KEY) { console.error('缺少 GEMINI_API_KEY'); process.exit(1); }

const BADGES = [
  { code: 'helper_1',  theme: '一颗闪亮的星星，简单可爱' },
  { code: 'helper_5',  theme: '两只手友好握手' },
  { code: 'helper_20', theme: '一座小奖杯周围环绕星星' },
  { code: 'feedback_5',  theme: '对话气泡与点赞手势' },
  { code: 'feedback_20', theme: '多个对话气泡组成的花园' },
  { code: 'topic_1', theme: '一张写着对勾的清单板' },
  { code: 'topic_5', theme: '灯泡与清单板，创意涌现' },
  { code: 'guide_1',  theme: '一本翻开的书' },
  { code: 'guide_5',  theme: '一叠书本与星星' },
  { code: 'guide_20', theme: '书本组成的皇冠' },
  { code: 'flower_10', theme: '一朵绽放的小红花' },
  { code: 'flower_50', theme: '一束繁茂的小红花' },
  { code: 'first_owner_top30', theme: '一面飘扬的旗帜' },
  { code: 'founder', theme: '一栋小房子顶上一颗星' },
  { code: 'seed', theme: '一颗发芽的种子' },
  { code: 'helpful_neighbor', theme: '微笑的邻居头像与爱心' },
  { code: 'mutual_aid_star', theme: '星星与两只互助的手' },
  { code: 'community_guardian', theme: '一面盾牌守护小房子' },
  { code: 'pet_friend', theme: '一只可爱的小猫与爱心' },
];

const STYLE = '扁平矢量插画风圆形勋章徽章：奶油白色 (#FFFFFF) 圆形徽章底，蜜桃橙色 (#E89B6C) 手绘感波浪描边，中央图标为细线条插画，点缀草绿色 (#5B9E6F)，背景纯色 #FFF8EE，构图居中、留白充足，治愈系暖色手绘风格，类似儿童绘本插画，无任何文字。图标主题：';

async function gen(badge, retry = 2) {
  const body = JSON.stringify({
    model: MODEL,
    messages: [{ role: 'user', content: STYLE + badge.theme + '。1024x1024。' }],
  });
  const res = await fetch(`${BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body,
  });
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || '';
  const m = content.match(/data:image\/(jpeg|png);base64,([A-Za-z0-9+/=]+)/);
  if (!m) {
    if (retry > 0) { console.log(`  重试 ${badge.code}...`); await new Promise(r => setTimeout(r, 3000)); return gen(badge, retry - 1); }
    throw new Error(`${badge.code} 无图片返回: ${JSON.stringify(data).slice(0, 150)}`);
  }
  return Buffer.from(m[2], 'base64');
}

mkdirSync(fileURLToPath(new URL('../src/assets/badges/', import.meta.url)), { recursive: true });
let ok = 0;
for (const b of BADGES) {
  try {
    const buf = await gen(b);
    const out = fileURLToPath(new URL(`../src/assets/badges/${b.code}.jpg`, import.meta.url));
    writeFileSync(out, buf);
    ok++;
    console.log(`[✓] ${b.code} (${Math.round(buf.length / 1024)}KB)`);
  } catch (e) { console.log(`[✗] ${e.message}`); }
  await new Promise(r => setTimeout(r, 1500));
}
console.log(`完成 ${ok}/${BADGES.length}`);
console.log('压缩命令：for f in src/assets/badges/*.jpg; do sips -Z 256 -s formatOptions 80 "$f" >/dev/null; done');
