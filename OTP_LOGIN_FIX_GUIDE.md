# OTP Login Flow - Troubleshooting & Testing Guide

## Changes Made ✅

### 1. **Frontend Login Component** (`client/src/components/Login.tsx`)
- Simplified OTP verification flow - removed unnecessary Firestore user creation
- Added better error handling for OTP verification
- The flow now properly returns the authenticated user from the backend

### 2. **Firebase Configuration** (`client/src/firebase/index.ts`)
- Added comprehensive console logging for debugging phone auth flow
- Logs included: OTP sent, OTP confirmation, Firebase token exchange, session storage
- Enhanced error messages for troubleshooting

### 3. **Backend Authentication** (`server/src/controllers/authController.ts`)
- Added detailed logging for Firebase token verification
- Added error handling for user creation failures
- Better error messages for frontend debugging

## Testing Checklist

### Web Testing (localhost)

#### Step 1: Start Both Services
```bash
# Terminal 1 - Server
cd server
npm run dev

# Terminal 2 - Client  
cd client
npm run dev
```

#### Step 2: Open in Browser
- Navigate to `http://localhost:5173`

#### Step 3: Test Phone OTP Login
1. Click **Phone** tab in login
2. **Verify reCAPTCHA container loads** - Should see Google reCAPTCHA box
3. Enter 10-digit mobile number (e.g., 9999999999)
4. Click "Send OTP"
   - **Check browser console** (F12 → Console)
   - Should see: `"Initiating phone sign-in for: +919999999999"`
   - Should see: `"OTP sent successfully"`
5. Enter 6-digit OTP from Firebase (check Firebase Console → Authentication → Phone numbers)
6. Click "Verify & Login"
   - **Watch console logs**:
     - `"Confirming OTP..."`
     - `"OTP confirmed by Firebase"`
     - `"Exchanging Firebase session for user: +919999999999"`
     - `"Firebase ID token obtained"`
     - `"Backend auth response received, storing session"`
     - `"User session stored successfully"`
     - `"Phone authentication completed successfully"`

#### Step 4: Verify Login Success
- After successful login, app should navigate to main dashboard
- Check browser DevTools:
  - **Storage → Local Storage** → Should contain:
    - `scorewala-auth-token` (JWT token)
    - `scorewala-auth-user` (user profile JSON)
  - **Network tab** → Should see `POST /api/auth/firebase` response with 200 status

### Android Device/Emulator Testing

#### Setup
```bash
cd client
npm run build:android
npx cap open android
```

#### Important for Emulator
- Firebase requires REAL phone number authentication (won't work with test numbers in emulator)
- For device testing: Use actual phone number and real SMS OTP

#### Debugging
1. **In Android Studio:**
   - Run app on emulator/device
   - Open Logcat (View → Tool Windows → Logcat)
   - Filter by JavaScript logs
   - Should see same console logs as web

2. **Network requests:**
   - Open Android Chrome DevTools
   - Go to `chrome://inspect` on desktop Chrome
   - Select device and open DevTools
   - Check Network tab for `/api/auth/firebase` requests

## Configuration Checklist

### Firebase Console Setup
1. **Go to Firebase Project Settings**
   - ✅ Phone Authentication enabled
   - ✅ reCAPTCHA credentials configured
   - ✅ Authorized domains include:
     - `localhost:5173`
     - Your production domain
     - For Android: Ensure SHA-1 certificate fingerprint is registered

2. **Environment Variables**
   - ✅ `.env` in client has all `VITE_FIREBASE_*` values
   - ✅ `.env` in server has `JWT_SECRET` set

### Server Configuration
1. **CORS in `server/src/config/env.ts`**
   - Should allow `http://localhost:5173`
   - Should allow `capacitor://localhost`
   - Check `getAllowedOrigins()` function

2. **Database**
   - ✅ MongoDB running and accessible
   - ✅ Connection string configured in `MONGO_URI`

## Common Issues & Solutions

### Issue 1: reCAPTCHA Container Not Loading
**Symptoms:** "reCAPTCHA load nahi hua" error
**Fix:**
1. Check Firebase Console → Settings → Authorized domains
2. Ensure domain is registered
3. Clear browser cache and reload

### Issue 2: "Invalid OTP" Error
**Symptoms:** Always shows "Invalid OTP" regardless of input
**Fix:**
1. Check console logs - see actual error message
2. Verify you're using correct OTP from Firebase
3. OTP expires after 5 minutes - send a new one if expired
4. Check Firebase project settings for OTP delivery

### Issue 3: Backend Returns 401 (Unauthorized)
**Symptoms:** Error in console: "HTTP 401: Failed to verify Firebase token"
**Server logs show:** "Firebase token verification failed"
**Fix:**
1. Verify `FIREBASE_API_KEY` environment variable
2. Check Firebase project ID is correct
3. Ensure Firebase Admin SDK is properly initialized
4. Test Firebase token verification independently

### Issue 4: User Created But Can't Login
**Symptoms:** Login succeeds but app shows login screen again
**Fix:**
1. Check if token is being stored in localStorage
2. Verify `auth.currentUser` is not null
3. Check if app is calling `/api/auth/firebase` endpoint
4. Monitor Network tab for failed requests

### Issue 5: Android Emulator Issues
**Symptoms:** Network errors on Android
**Fix:**
1. Use device IP instead of localhost: `10.0.2.2:3000`
2. Check Android firewall/security settings
3. Ensure Firebase is configured for Android package name
4. Verify SHA-1 certificate fingerprint in Firebase Console

## Debugging Commands

### Browser Console Testing
```javascript
// Check if session is stored
console.log('Auth Token:', localStorage.getItem('scorewala-auth-token'));
console.log('Auth User:', localStorage.getItem('scorewala-auth-user'));

// Test API call with token
const token = localStorage.getItem('scorewala-auth-token');
fetch('http://localhost:3000/api/users/me', {
  headers: { Authorization: `Bearer ${token}` }
}).then(r => r.json()).then(console.log);
```

### Server Logs
- Start server with `npm run dev`
- Watch for logs about token verification and user creation
- Check MongoDB logs if using local MongoDB

## Testing Sequence

1. ✅ Start both server and client
2. ✅ Open browser DevTools (F12)
3. ✅ Go to Console tab
4. ✅ Attempt OTP login and watch logs
5. ✅ Check Network tab for `/api/auth/firebase` call
6. ✅ Verify token storage in Local Storage
7. ✅ Test subsequent API calls
8. ✅ Test logout
9. ✅ Verify token removal from storage
10. ✅ Test Google login (should work if configured)

## Need Help?

If issues persist:
1. Collect **full console logs** (JavaScript and Network tabs)
2. Check **server logs** for backend errors
3. Verify all **environment variables** are set correctly
4. Confirm **Firebase project is properly configured**
5. Check **MongoDB connection** is working
