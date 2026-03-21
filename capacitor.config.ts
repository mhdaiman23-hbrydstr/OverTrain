import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.overtrain.gooonemore',
  appName: 'OverTrain: Go One More',
  webDir: 'out',
  
  // Server configuration for development
  server: {
    // For development, you can use live reload
    // url: 'http://localhost:3000',
    // cleartext: true,
    
    // For production, use the bundled app
    androidScheme: 'https',
    iosScheme: 'https',
  },
  
  // Android-specific configuration
  android: {
    buildOptions: {
      keystorePath: 'android/app/release-keystore.jks',
      keystoreAlias: 'keystore',
    },
    // Allow mixed content for development
    allowMixedContent: false,
    // Use legacy bridge for better compatibility
    useLegacyBridge: false,
  },
  
  // iOS-specific configuration
  ios: {
    // Content inset adjustment
    contentInset: 'automatic',
    // Preferred content mode
    preferredContentMode: 'mobile',
    // Scroll enabled
    scrollEnabled: true,
  },
  
  // Plugin configurations
  plugins: {
    // Splash Screen configuration
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false, // Manually hidden after React mounts to prevent white flash
      backgroundColor: '#000000',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false, // Show status bar after splash
    },
    
    // Status Bar configuration
    StatusBar: {
      backgroundColor: '#000000',
      style: 'LIGHT',
      overlaysWebView: false,
    },
    
    // Push Notifications configuration
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    
    // Local Notifications configuration
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#3b82f6',
      sound: 'default',
    },
    
    // SQLite configuration
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      iosIsEncryption: false,
      iosKeychainPrefix: 'overtrain',
      iosBiometric: {
        biometricAuth: false,
        biometricTitle: 'Biometric login for OverTrain',
      },
      androidIsEncryption: false,
      androidBiometric: {
        biometricAuth: false,
        biometricTitle: 'Biometric login for OverTrain',
        biometricSubTitle: 'Log in using your biometric credential',
      },
      electronIsEncryption: false,
      electronWindowsLocation: 'C:\\ProgramData\\CapacitorDatabases',
      electronMacLocation: '/Users/Shared/CapacitorDatabases',
      electronLinuxLocation: 'CapacitorDatabases',
    },
  },
};

export default config;
