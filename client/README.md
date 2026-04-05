# Client Deployment

## Build And Web Deployment

1. Create `client/.env` from `client/.env.example`.
2. Set `VITE_API_BASE_URL` to the public backend URL, for example `https://api.example.com/api`.
3. Install dependencies:
   `npm install`
4. Build:
   `npm run build`
5. Upload the contents of `dist/` to an S3 bucket configured for static hosting.
6. Put CloudFront in front of the bucket.
7. Configure CloudFront invalidation after each deploy.

Recommended AWS setup:

- S3 bucket holds the generated `dist/` files
- CloudFront serves the app globally
- Route53 points your domain to CloudFront
- The backend API stays on a separate subdomain such as `api.example.com`

## Capacitor Workflow

1. Install deps in `client/`.
2. Run `npm run build`.
3. Sync Capacitor:
   `npm run cap:sync`
4. Open Android Studio:
   `npm run cap:open`
5. Generate APK/AAB from Android Studio, or run inside `client/android/`:
   `./gradlew assembleRelease`

For iOS on macOS:

1. Add iOS once:
   `npx cap add ios`
2. Sync:
   `npx cap sync ios`
3. Open Xcode:
   `npx cap open ios`

## Mobile Asset Generation

1. Update app icons and splash assets in the Capacitor project.
2. Run a fresh frontend build.
3. Run `npm run cap:sync`.
4. Rebuild native binaries from Android Studio or Xcode.

Every time the React code changes, repeat:

1. `npm run build`
2. `npm run cap:sync`
3. Rebuild the native project
