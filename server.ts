import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8'));
initializeApp({
  projectId: firebaseConfig.projectId,
});
const db = getFirestore(firebaseConfig.firestoreDatabaseId);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- Custom API Endpoints ---

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Match Summary API
  app.get("/api/matches/:id/summary", async (req, res) => {
    try {
      const { id } = req.params;
      const matchDoc = await db.collection('matches').doc(id).get();
      
      if (!matchDoc.exists) {
        return res.status(404).json({ error: 'Match not found' });
      }

      const matchData = matchDoc.data();
      const [teamA, teamB] = await Promise.all([
        db.collection('teams').doc(matchData?.teamA).get(),
        db.collection('teams').doc(matchData?.teamB).get()
      ]);

      res.json({
        matchId: id,
        teamA: teamA.exists ? teamA.data()?.name : 'Team A',
        teamB: teamB.exists ? teamB.data()?.name : 'Team B',
        scoreA: matchData?.scoreA,
        scoreB: matchData?.scoreB,
        status: matchData?.status,
        currentInnings: matchData?.currentInnings,
        overs: matchData?.overs,
        playerStats: matchData?.playerStats || {}
      });
    } catch (error) {
      console.error('Error fetching match summary:', error);
      res.status(500).json({ error: 'Failed to fetch match summary' });
    }
  });

  // Player Stats API
  app.get("/api/players/:id/stats", async (req, res) => {
    try {
      const { id } = req.params;
      const playerDoc = await db.collection('players').doc(id).get();
      
      if (!playerDoc.exists) {
        return res.status(404).json({ error: 'Player not found' });
      }

      const playerData = playerDoc.data();
      
      // Fetch recent matches for this player
      const matchesSnap = await db.collection('matches')
        .where('status', '==', 'completed')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();

      const recentMatches = matchesSnap.docs
        .filter(d => d.data().playerStats && d.data().playerStats[id])
        .map(d => ({
          id: d.id,
          stats: d.data().playerStats[id],
          date: d.data().createdAt?.toDate() || new Date()
        }));

      res.json({
        playerId: id,
        name: playerData?.name,
        role: playerData?.role,
        overallStats: playerData?.stats || {},
        recentForm: recentMatches
      });
    } catch (error) {
      console.error('Error fetching player stats:', error);
      res.status(500).json({ error: 'Failed to fetch player stats' });
    }
  });

  // Live Matches API
  app.get("/api/matches/live", (req, res) => {
    res.json({
      matches: [
        { id: "match_1", teams: "IND vs PAK", score: "150/2 (18.4)", status: "live" },
        { id: "match_2", teams: "AUS vs ENG", score: "210/5 (20.0)", status: "completed" }
      ]
    });
  });

  // Tournament Standings API
  app.get("/api/tournaments/:id/standings", (req, res) => {
    const { id } = req.params;
    res.json({
      tournamentId: id,
      standings: [
        { team: "Team A", played: 5, won: 4, lost: 1, points: 8, nrr: "+1.25" },
        { team: "Team B", played: 5, won: 3, lost: 2, points: 6, nrr: "+0.45" },
        { team: "Team C", played: 5, won: 2, lost: 3, points: 4, nrr: "-0.15" }
      ]
    });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
