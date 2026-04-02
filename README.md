# Score Wala

This app uses a custom `Express + Node.js + MongoDB` backend while keeping Firebase Authentication for phone OTP login.

## Stack

- Frontend: React + Vite
- Backend: Express
- Database: MongoDB + Mongoose
- Compatibility layer: `src/firebase.ts` talks to REST APIs for app data while still using Firebase Auth for phone verification
- Process scaling: PM2 cluster mode via `ecosystem.config.cjs`

## Run Locally

Prerequisites:

- Node.js
- MongoDB running locally or a MongoDB Atlas connection string

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env` and set `MONGO_URI`
3. If the frontend is running from a different origin, also set `VITE_API_BASE_URL`
4. Start the app:
   `npm run dev`
5. Open:
   `http://localhost:3000`

## Production Deployment

1. Build the frontend:
   `npm run build`
2. Set production env vars in `.env`
3. Run with PM2 cluster mode:
   `pm2 start ecosystem.config.cjs`
4. Put Nginx or a cloud load balancer in front of the app

Recommended for 1000+ active users:

- Use MongoDB Atlas or a dedicated MongoDB server
- Run behind Nginx/Cloudflare/AWS ALB
- Use PM2 cluster mode on a multi-core machine
- Keep `CORS_ORIGIN` restricted in production
- Monitor `/api/health` and `/api/ready`

## Backend Structure

- `backend/config` database connection
- `backend/models` mongoose models
- `backend/controllers` auth and data controllers
- `backend/routes` express routes
- `backend/utils` path resolution and update helpers

## Notes

- Google login/signup now supports real Google OAuth when `VITE_GOOGLE_CLIENT_ID` is configured.
- Phone login uses Firebase phone authentication with reCAPTCHA and exchanges the Firebase ID token for the app's backend JWT.
- Set the `VITE_FIREBASE_*` values in `.env` if you want to override the bundled Firebase project config.
- If you see `Failed to fetch` in the browser console, the backend is not reachable from the frontend origin. Check that the dev server is running and `VITE_API_BASE_URL` points to the backend.
- Polling now uses backoff and hidden-tab slowdown to reduce backend load under heavy traffic.
