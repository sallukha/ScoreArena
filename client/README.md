# ScoreArena Frontend (Client) 📱

This is the client-side application for ScoreArena, engineered to deliver a fast, responsive, and mobile-native feel using web technologies.

## 🛠️ Technology Stack

- **Framework:** React 19 + Vite
- **Styling:** Tailwind CSS 4 & Lucide React for iconography
- **Real-Time:** Socket.IO Client for instant score updates
- **Mobile Native:** Capacitor (Core & Plugins) for Android/iOS builds
- **Authentication:** Firebase Auth (`@capacitor-firebase/authentication`)
- **Animations:** Motion (Framer Motion) for smooth page transitions and micro-interactions

## 📁 Project Structure

The codebase inside `src/` is modularized for maintainability:

- `api/`: API base URLs and Axios/Fetch transport abstractions.
- `app/`: Global layout and initialization wrappers.
- `components/`: Reusable UI components (Navbar, Modals, Forms, Scorers).
- `contexts/`: React Context providers (e.g., `AuthContext`).
- `features/`: Domain-specific logic or grouped feature components.
- `firebase/`: Firebase initialization and auth integration.
- `hooks/`: Custom React hooks for fetching data (`useLiveMatches`, `useUserCricketData`).
- `pages/`: Top-level route components (Home, Profile, Tournaments).

## ⚡ How It Works

The app employs a hybrid data-fetching strategy:
1. **REST APIs:** Used for loading static or less frequently changing data (user profiles, historical matches, team lists).
2. **WebSockets (Socket.IO):** When a user views a "Live Match" or acts as a "Scorer", the app connects to the Socket.IO room for that specific match to listen for or emit ball-by-ball updates.

## 🚀 Deployment & Mobile Build

### Web Deployment (AWS S3 + CloudFront)
1. Ensure `VITE_API_BASE_URL` is set in your `.env`.
2. Run `npm run build`.
3. Upload the generated `dist/` folder to an S3 bucket configured for static website hosting.
4. Set up CloudFront distribution pointing to the S3 bucket.

### Native Mobile Build (Capacitor)
ScoreArena is fully prepared to be distributed as a native app on the Google Play Store and Apple App Store.

**For Android:**
```bash
npm run build
npx cap sync android
npx cap open android
```
*Use Android Studio to generate the signed APK/AAB.*

**For iOS (Requires macOS):**
```bash
npx cap add ios
npx cap sync ios
npx cap open ios
```
*Use Xcode to build and archive the application.*

## 💡 Planned Enhancements
- **React Query Migration:** Moving all data fetching to `@tanstack/react-query` (currently installed but can be utilized more heavily) for built-in caching and retry logic.
- **Service Workers / PWA:** Enhancing the current caching strategy for a seamless offline-first experience.
