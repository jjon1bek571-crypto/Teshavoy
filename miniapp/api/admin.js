/* GET /api/admin?key=<KVDB_SECRET>[&season=YYYY-MM]
   G'olibni sovg'a oldidan TEKSHIRISH uchun (maxfiy).
   flags (shubhali sakrashlar soni) va hourXp ni ko'rsatadi.
   key = KVDB_SECRET (faqat sizda). season berilsa — o'sha mavsum, aks holda all-time. */

const { kvList, currentSeason } = require('./_lib');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const key = (req.query && req.query.key) || '';
  if (!process.env.KVDB_SECRET || key !== process.env.KVDB_SECRET) {
    return res.status(401).json({ error: 'forbidden' });
  }

  const season = (req.query && req.query.season) || null;
  const prefix = season ? `s:${season}:` : 'u:';
  const users  = (await kvList(prefix))
    .sort((a, b) => (b.xp || 0) - (a.xp || 0))
    .slice(0, 50)
    .map(p => ({
      user_id: p.user_id,
      name:    p.name,
      xp:      p.xp || 0,
      level:   p.level || 1,
      flags:   p.flags || 0,      // shubhali sakrashlar soni
      hourXp:  p.hourXp || 0,     // joriy soatdagi XP (rate-limit holati)
    }));

  return res.status(200).json({
    note: 'flags>0 -> qo\'lda tekshirish tavsiya etiladi',
    season: season || currentSeason(),
    users,
  });
};
