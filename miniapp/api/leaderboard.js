/* GET /api/leaderboard — top o'yinchilar (ochiq o'qish).
   Yozish bu yerda yo'q — faqat /api/score orqali (tekshirilgan). */

const { kvList } = require('./_lib');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')     return res.status(405).json({ error: 'GET only' });

  const users = await kvList('u:');
  users.sort((a, b) => (b.xp || 0) - (a.xp || 0));
  return res.status(200).json(users.slice(0, 30));
};
