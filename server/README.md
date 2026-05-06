# ScoreArena Backend (Server) ⚙️

The robust Node.js engine powering ScoreArena. It handles RESTful API requests, real-time WebSocket communication, and database management, ensuring data consistency and low-latency updates for live matches.

## 🛠️ Technology Stack

- **Runtime:** Node.js (v18+) with TypeScript
- **Framework:** Express.js (v4/v5)
- **Database:** MongoDB via Mongoose (v9)
- **Real-Time:** Socket.IO
- **Security & Logging:** Helmet, CORS, Morgan, Winston
- **Auth Validation:** Firebase Admin SDK

## 📁 Architecture & Directory Structure

The backend follows a standard controller-route-service pattern:

- `src/config/`: Environment loading, Database connection, Logger setup, and Firebase Admin initialization.
- `src/controllers/`: Business logic for handling incoming HTTP requests.
- `src/models/`: Mongoose schemas defining the data structure (Users, Matches, Teams, Tournaments).
- `src/routes/`: Express router definitions mapping endpoints to controllers.
- `src/realtime/`: Socket.IO hub logic (`socketHub.ts`). Handles room joining, emitting ball-by-ball events, and broadcasting global live match updates.
- `src/middleware/`: Express middlewares (e.g., Auth verification).

## 🔄 Real-Time Scoring Flow

1. A scorer updates the match from the Client (e.g., "6 runs").
2. The Client emits a socket event to the Server.
3. The Server's `SocketHub` intercepts the event, validates the payload, updates the MongoDB document.
4. The Server broadcasts the updated match state to all clients connected to that specific match room, ensuring sub-second sync across devices.

## 🚀 Deployment Guides

### AWS Elastic Beanstalk (Recommended for Auto-Scaling)
1. Configure your `.env` with production MongoDB URI and Firebase Admin credentials.
2. Build the project: `npm run build`.
3. Deploy the `server/` directory to Elastic Beanstalk (Node.js platform).
4. Configure environment variables in the EB Console. EB handles the reverse proxy (Nginx) and load balancing.

### VPS / EC2 with PM2
For a manual setup on a Linux VM:
```bash
npm install
npm run build
pm2 start ecosystem.config.cjs
pm2 save
```
*Ensure you configure an Nginx reverse proxy to forward port 80/443 traffic to port 3000.*

## 🔒 Security Best Practices Implemented
- **Helmet.js:** Secures Express apps by setting various HTTP headers.
- **CORS:** Strictly configured to allow traffic only from whitelisted client origins.
- **Health Checks:** `/api/health` and `/api/ready` endpoints implemented for load balancer and deployment orchestration (e.g., Kubernetes/AWS target groups).

## 💡 Future Enhancements
- **Redis Caching:** Implement a Cache-Aside strategy for frequently accessed data (like global live matches or tournament standings) to reduce MongoDB read load.
- **Rate Limiting:** Add `express-rate-limit` to protect endpoints against brute-force attacks or abuse.
