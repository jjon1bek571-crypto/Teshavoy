/* ============================================================
   MIYA.EXE — Backend yordamchilari (Vercel serverless, Node)
   - Telegram initData ni HMAC-SHA256 bilan tekshirish
   - kvdb.io bilan FAQAT server tomonida (maxfiy kalit bilan) ishlash
   Maxfiy ma'lumotlar muhit o'zgaruvchilarida (Vercel env):
     BOT_TOKEN     — botning tokeni (initData tekshiruvi uchun)
     KVDB_BUCKET   — maxfiy kalitli YANGI bucket id
     KVDB_SECRET   — bucket secret_key (faqat serverda!)
   ============================================================ */

const crypto = require('crypto');

const BOT_TOKEN   = process.env.BOT_TOKEN   || '';
const KVDB_BUCKET = process.env.KVDB_BUCKET || '';
const KVDB_SECRET = process.env.KVDB_SECRET || '';
const KV_BASE     = `https://kvdb.io/${KVDB_BUCKET}`;
const KV_AUTH     = 'Basic ' + Buffer.from(KVDB_SECRET + ':').toString('base64');

/* Cheklovlar. DIQQAT: ballar mijozda hisoblanadi — server ularni qayta
   hisoblamaydi. Shuning uchun bular faqat aql bovar himoya (tashqi
   buzg'unchilikni va absurd qiymatlarni to'xtatadi), to'liq cheat-proof emas. */
const LIMITS = {
  MAX_XP:     1000000,
  MAX_LEVEL:  5000,
  MAX_STREAK: 100000,
  MAX_COUNT:  1000000,
  MAX_IQ:     500,
  MAX_DELTA:  5000,    // bitta so'rovda XP eng ko'pi shuncha oshishi mumkin
  MAX_AGE:    86400,   // initData 24 soatdan eski bo'lsa rad etiladi (soniya)
};

function clampInt(v, min, max) {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

/* Telegram initData ni tekshiradi. Tekshirilgan `user` obyektini qaytaradi
   yoki yaroqsiz bo'lsa null. Telegram'da yangi `signature` maydoni borligi
   sababli data-check-string'ni ikki talqinda sinab ko'ramiz. */
function verifyInitData(initData) {
  if (!initData || !BOT_TOKEN) return null;
  let params;
  try { params = new URLSearchParams(initData); } catch { return null; }

  const hash = params.get('hash');
  if (!hash) return null;

  const authDate = parseInt(params.get('auth_date') || '0', 10);
  const now = Math.floor(Date.now() / 1000);
  if (!authDate || now - authDate > LIMITS.MAX_AGE) return null;

  // secret_key = HMAC_SHA256(key="WebAppData", data=bot_token)
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();

  const buildDCS = (excludeSignature) => {
    const pairs = [];
    for (const [k, v] of params.entries()) {
      if (k === 'hash') continue;
      if (excludeSignature && k === 'signature') continue;
      pairs.push(`${k}=${v}`);
    }
    return pairs.sort().join('\n');
  };

  for (const excl of [false, true]) {
    const calc = crypto.createHmac('sha256', secretKey).update(buildDCS(excl)).digest('hex');
    if (calc.length === hash.length &&
        crypto.timingSafeEqual(Buffer.from(calc), Buffer.from(hash))) {
      try { return JSON.parse(params.get('user') || 'null'); }
      catch { return null; }
    }
  }
  return null;
}

/* ── kvdb.io (maxfiy kalit bilan, faqat server) ── */

async function kvGet(key) {
  try {
    const r = await fetch(`${KV_BASE}/${encodeURIComponent(key)}`,
      { headers: { Authorization: KV_AUTH }, cache: 'no-store' });
    if (!r.ok) return null;
    const t = await r.text();
    try { return JSON.parse(t); } catch { return null; }
  } catch { return null; }
}

async function kvSet(key, valueObj) {
  await fetch(`${KV_BASE}/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: KV_AUTH, 'Content-Type': 'text/plain' },
    body: JSON.stringify(valueObj),
  });
}

async function kvList(prefix) {
  try {
    const url = `${KV_BASE}/?prefix=${encodeURIComponent(prefix)}&values=true&format=json&limit=300`;
    const r = await fetch(url, { headers: { Authorization: KV_AUTH }, cache: 'no-store' });
    if (!r.ok) return [];
    const arr = await r.json();                 // [[key, value], ...]
    const out = [];
    for (const [k, v] of arr) {
      let obj = v;
      if (typeof v === 'string') { try { obj = JSON.parse(v); } catch { obj = null; } }
      if (obj && obj.name) out.push({ user_id: k.replace(/^u:/, ''), ...obj });
    }
    return out;
  } catch { return []; }
}

module.exports = { verifyInitData, clampInt, kvGet, kvSet, kvList, LIMITS };
