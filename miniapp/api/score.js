/* POST /api/score — o'yinchi ballini saqlash.
   Faqat tekshirilgan Telegram foydalanuvchisi yoza oladi.
   Server XP'ni IKKI savatga yozadi:
     u:<id>            — barcha vaqt (all-time, kümülyativ)
     s:<season>:<id>   — joriy mavsum (delta orqali, 0 dan)
   Body: { initData, name?, xp, level, streak, games, iq }  (xp = all-time jami) */

const { verifyInitData, clampInt, kvGet, kvSet, LIMITS, currentSeason } = require('./_lib');

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
  const xp     = clampInt(body.xp,     0, LIMITS.MAX_XP);
  const level  = clampInt(body.level,  1, LIMITS.MAX_LEVEL);
  const streak = clampInt(body.streak, 0, LIMITS.MAX_STREAK);
  const games  = clampInt(body.games,  0, LIMITS.MAX_COUNT);
  const iq     = clampInt(body.iq,     0, LIMITS.MAX_IQ);

  // 3. ALL-TIME: kamaymasin, bitta so'rovda katta sakramasin
  const prev    = await kvGet(key);
  const prevAll = (prev && typeof prev.xp === 'number') ? prev.xp : 0;
  let   allXp   = xp;
  if (allXp < prevAll) allXp = prevAll;
  if (allXp - prevAll > LIMITS.MAX_DELTA) allXp = prevAll + LIMITS.MAX_DELTA;

  const now = Date.now();
  await kvSet(key, { name, xp: allXp, level, streak, games, iq, ts: now });

  // 4. MAVSUM: seasonXp = all-time - (mavsum boshidagi all-time)
  const season = currentSeason();
  const skey   = `s:${season}:${uid}`;
  const sPrev  = await kvGet(skey);
  const baseXp = (sPrev && typeof sPrev.baseXp === 'number') ? sPrev.baseXp : prevAll;
  let   seasonXp = allXp - baseXp;
  if (seasonXp < 0) seasonXp = 0;
  await kvSet(skey, { name, baseXp, xp: seasonXp, level, ts: now });

  return res.status(200).json({ ok: true, xp: allXp, seasonXp, season });
};
