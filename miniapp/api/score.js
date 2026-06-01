/* POST /api/score — o'yinchi ballini saqlash.
   Faqat tekshirilgan Telegram foydalanuvchisi yoza oladi.
   Body: { initData, name?, xp, level, streak, games, iq } */

const { verifyInitData, clampInt, kvGet, kvSet, LIMITS } = require('./_lib');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'POST only' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  // 1. Telegram'ni tekshiramiz — bu yerda aldab bo'lmaydi (HMAC)
  const user = verifyInitData(body.initData);
  if (!user || !user.id) {
    return res.status(401).json({ error: 'Telegram tekshiruvi muvaffaqiyatsiz' });
  }

  const uid  = String(user.id);
  const key  = 'u:' + uid;
  const name = (user.first_name || user.username || body.name || 'Anonim')
                 .toString().trim().slice(0, 32) || 'Anonim';

  // 2. Qiymatlarni cheklaymiz (absurd sonlarni rad etamiz)
  let   xp     = clampInt(body.xp,     0, LIMITS.MAX_XP);
  const level  = clampInt(body.level,  1, LIMITS.MAX_LEVEL);
  const streak = clampInt(body.streak, 0, LIMITS.MAX_STREAK);
  const games  = clampInt(body.games,  0, LIMITS.MAX_COUNT);
  const iq     = clampInt(body.iq,     0, LIMITS.MAX_IQ);

  // 3. Oldingi qiymatga nisbatan: kamaymasin, bitta so'rovda katta sakramasin
  const prev = await kvGet(key);
  if (prev && typeof prev.xp === 'number') {
    if (xp < prev.xp) xp = prev.xp;
    if (xp - prev.xp > LIMITS.MAX_DELTA) xp = prev.xp + LIMITS.MAX_DELTA;
  }

  await kvSet(key, { name, xp, level, streak, games, iq, ts: Date.now() });
  return res.status(200).json({ ok: true, xp });
};
