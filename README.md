# ScoreArena 🏏

ScoreArena is a modern, real-time cricket scoring platform designed to bring professional-grade match tracking, team management, and live score broadcasting to local and amateur cricket communities.

## 🌟 Why ScoreArena?

Local cricket matches often rely on paper scorebooks or disjointed apps. ScoreArena bridges the gap by offering a seamless, mobile-first experience that combines the ease of a digital scorer with the power of real-time web sockets. Whether you are tracking a friendly neighborhood match or managing a multi-team tournament, ScoreArena keeps every player and fan in the loop.

## 🏗️ Architecture Overview

The repository is organized into a monorepo-style structure containing two independently deployable applications:

### 1. Client (`/client`)
A high-performance, mobile-first frontend built with **React**, **Vite**, and **Tailwind CSS**. 
- **Cross-Platform:** Prepared for native iOS and Android deployment using **Capacitor**.
- **Real-Time UI:** Integrates with Socket.IO to provide instant score updates without refreshing.
- **Authentication:** Powered by Firebase Authentication for secure access.

### 2. Server (`/server`)
A robust Node.js and Express backend handling business logic and data persistence.
- **Database:** Uses **MongoDB** (via Mongoose) to store users, matches, teams, and tournaments.
- **Real-Time Hub:** Implements a **Socket.IO** server to broadcast live scoring events to connected clients.
- **Security:** Validates Firebase JWT tokens via Firebase Admin SDK.

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (Local instance or MongoDB Atlas)
- Firebase Project (for Authentication)

### Setup Steps

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd ScoreArena
   ```

2. **Configure Environment Variables:**
   ```bash
   cp client/.env.example client/.env
   cp server/.env.example server/.env
   ```
   *Fill in your Firebase config and MongoDB URI in the respective `.env` files.*

3. **Install Dependencies & Run Backend:**
   ```bash
   cd server
   npm install
   npm run dev
   ```
   *Backend runs on `http://localhost:3000`*

4. **Install Dependencies & Run Frontend:**
   ```bash
   cd ../client
   npm install
   npm run dev
   ```
   *Frontend runs on `http://localhost:5173`*

## 🔮 Future Enhancements
- **Advanced Statistics:** Player heatmaps, wagon wheels, and deep career stats.
- **Offline Mode:** Full offline scoring capabilities with background sync when reconnected.
- **Push Notifications:** Deep integration with FCM for live match alerts.

## 👥 Developers
ScoreArena is built with a focus on clean code and scalability. Check out the individual `README.md` files in the `client/` and `server/` directories for deep dives into their respective codebases.
