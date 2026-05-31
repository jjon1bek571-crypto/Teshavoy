"""
MIYA.EXE Backend — FastAPI + SQLite
Ishga tushirish: python -m uvicorn main:app --reload --port 8000
"""

import sqlite3
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="MIYA.EXE API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "miya.db"


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id   TEXT PRIMARY KEY,
            name      TEXT NOT NULL,
            xp        INTEGER DEFAULT 0,
            level     INTEGER DEFAULT 1,
            streak    INTEGER DEFAULT 0,
            roasts    INTEGER DEFAULT 0,
            games     INTEGER DEFAULT 0,
            iq        INTEGER DEFAULT 0,
            badges    TEXT DEFAULT '[]',
            updated   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()


@app.on_event("startup")
def startup():
    init_db()
    print("✅ MIYA.EXE Backend ishga tushdi! http://localhost:8000")


# ── Modellar ──────────────────────────────────────────────────

class UserData(BaseModel):
    user_id: str
    name: str
    xp: int = 0
    level: int = 1
    streak: int = 0
    roasts: int = 0
    games: int = 0
    iq: int = 0
    badges: str = "[]"


# ── Endpointlar ───────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "ok", "app": "MIYA.EXE", "version": "1.0.0"}


@app.post("/api/user")
def save_user(data: UserData):
    """Foydalanuvchi ma'lumotlarini saqlash yoki yangilash"""
    conn = get_db()
    try:
        conn.execute("""
            INSERT INTO users (user_id, name, xp, level, streak, roasts, games, iq, badges, updated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id) DO UPDATE SET
                name    = excluded.name,
                xp      = excluded.xp,
                level   = excluded.level,
                streak  = excluded.streak,
                roasts  = excluded.roasts,
                games   = excluded.games,
                iq      = excluded.iq,
                badges  = excluded.badges,
                updated = CURRENT_TIMESTAMP
        """, (data.user_id, data.name, data.xp, data.level,
              data.streak, data.roasts, data.games, data.iq, data.badges))
        conn.commit()
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.get("/api/user/{user_id}")
def get_user(user_id: str):
    """Foydalanuvchi ma'lumotlarini olish"""
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE user_id = ?", (user_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    return dict(row)


@app.get("/api/leaderboard")
def leaderboard(limit: int = 20):
    """Top o'yinchilar reytingi"""
    conn = get_db()
    rows = conn.execute("""
        SELECT user_id, name, xp, level, streak, games, iq
        FROM users
        ORDER BY xp DESC, level DESC
        LIMIT ?
    """, (min(limit, 50),)).fetchall()
    conn.close()
    result = []
    for i, row in enumerate(rows):
        result.append({
            "rank":    i + 1,
            "user_id": row["user_id"],
            "name":    row["name"],
            "xp":      row["xp"],
            "level":   row["level"],
            "streak":  row["streak"],
            "games":   row["games"],
            "iq":      row["iq"],
        })
    return result


@app.get("/api/stats")
def stats():
    """Umumiy statistika"""
    conn = get_db()
    total = conn.execute("SELECT COUNT(*) as cnt FROM users").fetchone()["cnt"]
    top   = conn.execute("SELECT MAX(xp) as max_xp FROM users").fetchone()["max_xp"] or 0
    conn.close()
    return {"total_users": total, "top_xp": top}
