const brand = process.env.BRAND || process.env.EXPO_PUBLIC_BRAND || 'veganland';
const isNovaQI = brand === 'novaqi';

const B = isNovaQI ? 'NovaQI' : 'VeganLand';
const assets = isNovaQI ? './assets/novaqi' : './assets';

const fbAppId = process.env.EXPO_PUBLIC_FB_APP_ID || '';
const fbClientToken = process.env.EXPO_PUBLIC_FB_CLIENT_TOKEN || '';
const fbConfigured = !!(fbAppId && fbClientToken);

// Google Sign-In (NovaQI only). iOS URL scheme is the REVERSED_CLIENT_ID from
// GoogleService-Info.plist (e.g. com.googleusercontent.apps.1234567890-abc).
const googleIosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME || '';
const googleSignInPlugin = isNovaQI && googleIosUrlScheme
  ? [['@react-native-google-signin/google-signin', { iosUrlScheme: googleIosUrlScheme }]]
  : [];
const appleSignInPlugin = isNovaQI ? ['expo-apple-authentication'] : [];

// Firebase Analytics (NovaQI only — google-services.json/GoogleService-Info.plist
// are only registered for app.novaqi). Re-added for v1.0.19: the original
// build incompatibility (useFrameworks:'static' + RNFBApp modular headers,
// see commit 87739aa) no longer applies since that setting was removed; the
// only conflict hit on current RNFirebase (v26) is Swift Package Manager
// resolving Firebase alongside static linkage, fixed by disableSPM below
// (a real RNFirebase config-plugin option, durable across EAS's own prebuild
// — not a hand-edit to ios/Podfile). Auto-collection stays off by default
// (firebase.json) until ATT/disclaimer consent, same gating as the Meta SDK
// in analyticsService.native.js.
const firebasePlugin = isNovaQI ? [['@react-native-firebase/app', { ios: { disableSPM: true } }]] : [];

const SKADNETWORK_IDS = [
  'v9wttpbfk9.skadnetwork',
  'n38lu8286q.skadnetwork',
  'cstr6suwn9.skadnetwork',
  '4fzdc2evr5.skadnetwork',
  '2u9pt9hc89.skadnetwork',
  '8s468mfl3y.skadnetwork',
  'klf5c3l5u5.skadnetwork',
  'ppxm28t8ap.skadnetwork',
  '424m5254lk.skadnetwork',
  'kbd757ywx3.skadnetwork',
  'uw77j35x4d.skadnetwork',
  '578prtvx9j.skadnetwork',
  '4dzt52r2t5.skadnetwork',
  'gta9lk7p23.skadnetwork',
  'e5fvkxwrpn.skadnetwork',
  '8c4e2ghe7u.skadnetwork',
  'zq492l623r.skadnetwork',
  '3qy4746246.skadnetwork',
  '3sh42y64q3.skadnetwork',
  'f38h382jlk.skadnetwork',
  'hs6bdukanm.skadnetwork',
  'prcb7njmu6.skadnetwork',
  'wzmmz9fp6w.skadnetwork',
  'yclnxrl5pm.skadnetwork',
  't38b2kh725.skadnetwork',
  '7ug5zh24hu.skadnetwork',
  '9rd848q2bz.skadnetwork',
  'y5ghdn5j9k.skadnetwork',
  'n6fk4nfna4.skadnetwork',
  'v72qych5uu.skadnetwork',
  'ludvb6z3bs.skadnetwork',
  'mtkv5xtk9e.skadnetwork',
  'tl55sbb4fm.skadnetwork',
];

const fbPlugin = fbConfigured
  ? [
      [
        'react-native-fbsdk-next',
        {
          appID: fbAppId,
          clientToken: fbClientToken,
          displayName: B,
          scheme: `fb${fbAppId}`,
          advertiserIDCollectionEnabled: false,
          autoLogAppEventsEnabled: false,
          isAutoInitEnabled: false,
          iosUserTrackingPermission: `Allow ${B} to measure ad performance so we can show you more relevant content and continue improving the app.`,
        },
      ],
    ]
  : [];

export default {
  expo: {
    name: B,
    slug: isNovaQI ? 'novaqi' : 'veganland',
    version: '1.0.19', // NEVER bump without a new native build — runtimeVersion = appVersion
    orientation: 'portrait',
    icon: `${assets}/icon.png`,
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: `${assets}/splash-icon.png`,
      resizeMode: 'contain',
      backgroundColor: isNovaQI ? '#0E1B14' : '#2E7D52',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: isNovaQI ? 'app.novaqi' : 'app.veganland',
      // Firebase config for iOS — required by @react-native-firebase/app at prebuild.
      // File is committed at the repo root; EAS picks it up at build time.
      googleServicesFile: isNovaQI ? './GoogleService-Info.plist' : undefined,
      // Sign in with Apple — adds the entitlement so EAS bakes it into the
      // provisioning profile. Requires the capability enabled in the Apple
      // Developer portal for App ID app.novaqi.
      usesAppleSignIn: isNovaQI,
      infoPlist: {
        NSCameraUsageDescription: `${B} needs camera access to scan product labels and ingredients.`,
        NSPhotoLibraryUsageDescription: `${B} needs photo library access to analyze product images.`,
        NSPhotoLibraryAddUsageDescription: `${B} saves product scan images to your library.`,
        NSUserTrackingUsageDescription: `Allow ${B} to measure ad performance so we can show you more relevant content and continue improving the app.`,
        ITSAppUsesNonExemptEncryption: false,
        SKAdNetworkItems: SKADNETWORK_IDS.map(id => ({ SKAdNetworkIdentifier: id })),
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: `${assets}/adaptive-icon.png`,
        backgroundColor: isNovaQI ? '#0E1B14' : '#2E7D52',
      },
      package: isNovaQI ? 'app.novaqi' : 'app.veganland',
      // AD_ID required by Google Play for apps targeting Android 13+ that
      // use the advertising identifier — Meta SDK reads it for ad attribution.
      // Without this, the ID is zeroed and Meta Ads attribution breaks.
      permissions: ['android.permission.CAMERA', 'com.google.android.gms.permission.AD_ID'],
      // Android's default Auto Backup silently restores AsyncStorage
      // (session token, cached profile) from the device's Google account on
      // reinstall — "reinstalling to start fresh" doesn't actually start
      // fresh, it can drop the user straight into an authenticated screen
      // with a stale/invalid token, no login screen involved at all.
      // Confirmed live 2026-09-28: a fresh Play Store install skipped
      // straight to onboarding without ever asking for a login.
      allowBackup: false,
      edgeToEdgeEnabled: true,
      versionCode: 22,
      // Firebase config — required for FCM (push) and Firebase Analytics.
      // The file is committed at the repo root; EAS picks it up at build time.
      googleServicesFile: isNovaQI ? './google-services.json' : undefined,
    },
    web: {
      favicon: `${assets}/favicon.png`,
      title: B,
      name: B,
    },
    experiments: {
      baseUrl: '',
    },
    plugins: [
      'expo-font',
      ['expo-camera', { cameraPermission: `${B} needs camera access to scan products.` }],
      // Vision Camera bundled into the native build (v1.0.17) so a future automatic
      // body-scan flow can ship purely via OTA. Frame processors enabled (worklets),
      // location & microphone disabled — we only need silent video frames for
      // on-device pose detection via react-native-fast-tflite. Do NOT rely on this
      // library from JS yet: the feature that uses it will be added later via OTA.
      [
        'react-native-vision-camera',
        {
          cameraPermissionText: `${B} needs camera access for the automatic body scan.`,
          enableMicrophonePermission: false,
          enableLocation: false,
          enableFrameProcessors: true,
        },
      ],
      // Fast TFLite bundled so we can load MoveNet / MediaPipe / any .tflite model
      // via OTA. CoreML delegate (Apple Neural Engine) and Android GPU delegate
      // are enabled — both add native code that must be present in the binary.
      [
        'react-native-fast-tflite',
        {
          enableCoreMLDelegate: true,
          enableAndroidGpuLibraries: true,
        },
      ],
      ['expo-image-picker', { photosPermission: `${B} needs photo access to analyze product images.` }],
      [
        'expo-tracking-transparency',
        {
          userTrackingPermission: `Allow ${B} to measure ad performance so we can show you more relevant content and continue improving the app.`,
        },
      ],
      [
        'expo-notifications',
        {
          icon: isNovaQI ? './assets/novaqi/notification-icon.png' : './assets/veganland/notification-icon.png',
          color: isNovaQI ? '#0E1B14' : '#7CB518',
        },
      ],
      ...firebasePlugin,
      ...fbPlugin,
      ...appleSignInPlugin,
      ...googleSignInPlugin,
      // GoogleSignin -> AppCheckCore (Swift) -> GoogleUtilities + RecaptchaInterop.
      // The latter two aren't modules by default, which blocks Swift pod integration
      // as static libraries. Enable module maps for just those two so we don't have
      // to flip `use_modular_headers!` globally (which would touch every pod).
      [
        'expo-build-properties',
        {
          ios: {
            extraPods: [
              { name: 'GoogleUtilities', modular_headers: true },
              { name: 'RecaptchaInterop', modular_headers: true },
            ],
          },
        },
      ],
    ],
    updates: {
      url: `https://u.expo.dev/${isNovaQI ? '08a6532d-79dd-4681-924f-471645e23370' : '64fa402d-0f4c-4582-8879-e032ddaa946e'}`,
      // Fresh installs check for a newer OTA on first cold start and wait
      // up to 8s during splash to apply it. Prevents the "first-open shows
      // the stale bundled JS, second open finally shows the new UX" gap
      // that would otherwise let new users see the old paywall lock before
      // the OTA arrived.
      fallbackToCacheTimeout: 8000,
      checkAutomatically: 'ON_LOAD',
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
    extra: {
      eas: {
        projectId: isNovaQI
          ? '08a6532d-79dd-4681-924f-471645e23370'
          : '64fa402d-0f4c-4582-8879-e032ddaa946e',
      },
    },
  },
};
