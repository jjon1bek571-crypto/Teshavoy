// Vercel Serverless Function — foydalanuvchi scoreni saqlash
// Xotira: Vercel Edge Config yoki KV ishlatilmaydi (bepul tier)
// O'rniga: JSON fayl kabi ishlaydigan in-memory store (demo uchun)
// Production uchun: Vercel KV yoki Upstash Redis ulash kerak

const scores = {}; // In-memory (restart bo'lsa o'chadi — demo uchun yetarli)

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    const { user_id, name, xp, level, streak, games, iq } = req.body || {};
    if (!user_id || !name) return res.status(400).json({ error: 'user_id va name kerak' });
    scores[user_id] = { name, xp: +xp || 0, level: +level || 1, streak: +streak || 0, games: +games || 0, iq: +iq || 0, updated: Date.now() };
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'GET') {
    const leaderboard = Object.entries(scores)
      .map(([uid, d]) => ({ user_id: uid, ...d }))
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 20);
    return res.status(200).json(leaderboard);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
