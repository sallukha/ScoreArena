# ScoreArena

## Overview
ScoreArena is a real-time, comprehensive cricket scoring and tournament management application. It is built with a modern, decoupled architecture featuring a React-based progressive web app (PWA) configured for native mobile deployment via Capacitor, backed by a robust Node.js API. It leverages MongoDB for persistent storage, Socket.IO for real-time live match updates, and Firebase for authentication and real-time document synchronization.

## Architecture & Tech Stack

### Frontend (Client)
- **Framework:** React 19 & Vite
- **Styling:** Tailwind CSS v4
- **State & Real-time:** Socket.IO Client, Firebase SDK (Firestore)
- **Animations:** Motion (Framer Motion)
- **Mobile Orchestration:** Capacitor (targeting Android natively)

### Backend (Server)
- **Runtime:** Node.js
- **Web Framework:** Express.js
- **Database:** MongoDB (via Mongoose)
- **Real-time Engine:** Socket.IO
- **Services:** Firebase Admin SDK (Authentication/Admin tasks)
- **Logging & Security:** Winston, Helmet, CORS

## Project Structure
- `client/` - Frontend single-page application and Capacitor configuration.
- `server/` - Backend REST API and WebSocket server.
- `android/` - Capacitor-generated native Android project workspace.
- `firestore.rules` - Firebase database security rules.
- `OTP_LOGIN_FIX_GUIDE.md` - Documentation covering Firebase Authentication setups.

---

## Local Development Setup

### Prerequisites
- Node.js (v20+ recommended)
- MongoDB running locally or a MongoDB Atlas connection string.
- Firebase Project configured (Web bindings and Service Account).

### 1. Environment Configuration
Copy the example environment files to their respective local `.env` files:

**Client:**
```bash
cp client/.env.example client/.env
# Replace the VITE_FIREBASE_* placeholders with your Firebase project config keys.
```

**Server:**
```bash
cp server/.env.example server/.env
# Update MONGO_URI, PORT, and place your Firebase service-account details.
```

### 2. Install Dependencies
```bash
# Install frontend dependencies
cd client && npm install

# Install backend dependencies
cd ../server && npm install
```

### 3. Start Development Servers
Start both the backend API and the frontend Dev server concurrently (use two terminal tabs):

```bash
# Tab 1: Server
cd server && npm run dev

# Tab 2: Client
cd client && npm run dev
```
- **Client URL:** `http://localhost:5173`
- **Server URL:** `http://localhost:3000`

---

## Moving to Production Deployment

Deploying ScoreArena for a live user-base requires migrating from the local setup to a scalable cloud infrastructure.

### 1. Backend Deployment (Server)
- **Hosting:** Use PAAS platforms like Render, Heroku, AWS Elastic Beanstalk, or run a Docker container on DigitalOcean App Platform/AWS ECS.
- **Database:** Transition from local MongoDB to **MongoDB Atlas** (Managed Cloud Database). Ensure IP access lists are properly configured to only allow access from your hosted backend instance.
- **Environment Variables:** Set `NODE_ENV=production`. Make sure all secrets, standard variables, and `ALLOWED_ORIGINS` (configured to point to your live frontend URL) are securely stored.
- **Process Manager:** For VM-based deployments (EC2, Droplets), use a process manager like **PM2** to handle app clustering and auto-restarts upon crashes. Use `npm run start` combined with the provided `ecosystem.config.cjs`.

### 2. Frontend Web Deployment (Web)
- **Build Step:** Run `npm run build` in the `client` directory. This creates a highly optimized, minified static bundle in the `client/dist` folder.
- **Hosting Migration:** Deploy the `dist` folder directly to static CDNs like **Vercel**, **Netlify**, or **Firebase Hosting**.
- **Variables Checkout:** Before building, make sure the `VITE_API_URL` environment variable points directly to your production backend domain (e.g., `https://api.scorearena.com`).

### 3. Native Android Deployment (Capacitor)
- Confirm your package name and App ID within `client/capacitor.config.ts`.
- Make a fresh production build and sync it with Capacitor:
  ```bash
  cd client && npm run build:android
  ```
- Open Android Studio:
  ```bash
  npm run cap:open
  ```
- Use Android Studio's **Build > Generate Signed Bundle / APK...** workflow to create an `.aab` file for Google Play Console submission.

---

## Senior Engineering Review & Proposed Improvements

As the platform scales to support concurrent live tournaments and broader user bases, here are priority architectural and code-level refinements:

### 1. Application State & Lifecycle Management
- **Current Limitation:** The client heavily relies on localized state, prop-drilling, and direct Firebase `onSnapshot` attachments nested deeply within component lifecycles (seen in `MatchDetails`).
- **Improvement:** Introduce a centralized state management solution (e.g., **Zustand** or **Redux Toolkit**). Encapsulate and abstract Socket.IO and Firestore listeners into robust custom hooks (`useLiveMatch(matchId)`). Ensure proper unmounting and lifecycle clean-up to mitigate severe memory leaks on long-running single-page app sessions.

### 2. Backend Security & Role-Based Access Control (RBAC)
- **Current Limitation:** Firebase usage is distributed across both client (direct DB calls) and server contexts.
- **Improvement:** Fully audit `firestore.rules`. Sensitive modifications (like editing tournament scores or creating new data edges) should be stripped from the client SDK and pushed uniformly behind the Node.js REST API. This minimizes the client-side attack surface and ensures total consistency through server-side validation.

### 3. API Type-Safety & Validation
- **Current Limitation:** The bridge between client API requests and Express server routes relies heavily on loose contracts.
- **Improvement:** Integrate **Zod** or **Joi** in the Express server to heavily sanitize and validate incoming request bodies. Furthermore, adopting **tRPC** or auto-generating OpenAPI (Swagger) clients would provide end-to-end type safety, eliminating frontend runtime errors caused by unexpected backend payloads.

### 4. Performance & Infrastructure Caching
- **Current Limitation:** High-frequency read queries to MongoDB/Firestore for live scoreboards scale linearly with active spectator count, which limits scalability and drives up database billing.
- **Improvement:** 
  - **Redis Caching Loop:** Implement Redis on the Node backend. Live socket events should write state to Redis immediately while batch-syncing to MongoDB at controlled intervals. Spectators joining late fetch from the Redis cache instantly instead of burning DB read operations.
  - **App-Check Coverage:** Apply Firebase App Check across the ecosystem to block unverified clients/bots from polling the backend APIs or Firestore SDK endpoints.
  - **Client Lazy Loading:** Utilize React `Suspense` and `lazy` loading for heavy, admin-related routes (e.g. Scorer view, Tournament Creation) to optimize the initial JavaScript bundle sent to primarily static viewers.

### 5. Automated CI/CD
- **Current Limitation:** Deployment relies heavily on local developer environments, allowing regression faults.
- **Improvement:** Adopt a solid DevOps pipeline via **GitHub Actions** or **GitLab CI**:
  - Run `npm run lint` and TypeScript Type-Checking (`tsc --noEmit`) sequentially on all pull requests.
  - Establish a test suite (using **Vitest** or **Jest**) covering pure utility functions and critical backend data-handlers.
  - Configure automatic branching deployments (Push to `main` -> Automatically deploy to Vercel/Render).
