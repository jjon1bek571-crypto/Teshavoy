/* GET /api/leaderboard — top o'yinchilar (ochiq o'qish).
   Query:
     type=season (standart) — joriy mavsum reytingi
     type=alltime           — barcha vaqt reytingi
   Javob: { type, season, daysLeft, players: [{user_id,name,xp,level}, ...] }
   Yozish bu yerda yo'q — faqat /api/score orqali (tekshirilgan). */

const { kvList, seasonInfo } = require('./_lib');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')     return res.status(405).json({ error: 'GET only' });

  const { season, daysLeft } = seasonInfo();
  const type = (req.query && req.query.type) === 'alltime' ? 'alltime' : 'season';

  const prefix  = type === 'alltime' ? 'u:' : `s:${season}:`;
  const players = (await kvList(prefix))
    .sort((a, b) => (b.xp || 0) - (a.xp || 0))
    .slice(0, 30)
    // Faqat ommaviy maydonlar (ichki: flags, hourXp, baseXp yashirin qoladi)
    .map(p => ({ user_id: p.user_id, name: p.name, xp: p.xp || 0, level: p.level || 1 }));

  return res.status(200).json({ type, season, daysLeft, players });
};
