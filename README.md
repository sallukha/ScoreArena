# ScoreArena

This repository is now split into two deployable applications:

- `client/`: React + Vite + Capacitor
- `server/`: Node.js + Express + MongoDB + Socket.IO

Firebase browser SDK code lives under `client/src/firebase/`. Server-side Firebase Admin initialization lives under `server/src/config/firebaseAdmin.ts`.

## Local Development

1. Install frontend deps:
   `cd client && npm install`
2. Install backend deps:
   `cd ../server && npm install`
3. Copy env files:
   `client/.env.example -> client/.env`
   `server/.env.example -> server/.env`
4. Start backend:
   `cd server && npm run dev`
5. Start frontend:
   `cd client && npm run dev`

Frontend default URL:
`http://localhost:5173`

Backend default URL:
`http://localhost:3000`

## Architecture

- `client/src/api/`: API base URL and HTTP transport abstraction
- `client/src/firebase/`: Firebase Auth + REST-backed data layer used by the React app
- `server/src/config/`: env loading, logging, Firebase Admin, database config
- `server/src/routes/`: route registration
- `server/src/controllers/`: request handlers
- `server/src/realtime/`: Socket.IO hub

## Deployment

Detailed AWS and Capacitor deployment documentation is available in:

- `client/README.md`
- `server/README.md`
