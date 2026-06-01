/* GET /api/referral?uid=<uid> — foydalanuvchining taklif (referral) sonini qaytaradi.
   Referrallarni BOT yozadi (ref:<uid> kaliti). Bu endpoint faqat o'qiydi. */

const { kvGet } = require('./_lib');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')     return res.status(405).json({ error: 'GET only' });

  const uid = String((req.query && req.query.uid) || '').trim();
  if (!uid) return res.status(400).json({ error: 'uid kerak' });

  const rec   = await kvGet('ref:' + uid);
  const count = (rec && typeof rec.count === 'number') ? rec.count : 0;
  const need  = 5;
  return res.status(200).json({ uid, count, need, ok: count >= need });
};
