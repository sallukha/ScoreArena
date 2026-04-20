import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.scorewala.app',
  appName: 'ScoreArena',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2400,
      backgroundColor: "#08191D",
      showSpinner: false,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#000000",
      splashFullScreen: true,
      splashImmersive: true,
    },

    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ["google.com"],
    },
    GoogleAuth: {
      scopes: ["profile", "email"],
      serverClientId: "838787006701-9aii1bk6tjtouv8241h55ni5e8tesaue.apps.googleusercontent.com",
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
