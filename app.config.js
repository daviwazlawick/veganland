const brand = process.env.BRAND || process.env.EXPO_PUBLIC_BRAND || 'veganland';
const isNovaQI = brand === 'novaqi';

const B = isNovaQI ? 'NovaQI' : 'VeganLand';
const assets = isNovaQI ? './assets/novaqi' : './assets';

const fbAppId = process.env.EXPO_PUBLIC_FB_APP_ID || '';
const fbClientToken = process.env.EXPO_PUBLIC_FB_CLIENT_TOKEN || '';
const fbConfigured = !!(fbAppId && fbClientToken);

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
    version: '1.0.11', // NEVER bump without a new native build — runtimeVersion = appVersion
    orientation: 'portrait',
    icon: `${assets}/icon.png`,
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: `${assets}/splash-icon.png`,
      resizeMode: 'contain',
      backgroundColor: isNovaQI ? '#1E1B4B' : '#2E7D52',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: isNovaQI ? 'app.novaqi' : 'app.veganland',
      // Firebase config for iOS — required by @react-native-firebase/app at prebuild.
      // File is committed at the repo root; EAS picks it up at build time.
      googleServicesFile: isNovaQI ? './GoogleService-Info.plist' : undefined,
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
        backgroundColor: isNovaQI ? '#1E1B4B' : '#2E7D52',
      },
      package: isNovaQI ? 'app.novaqi' : 'app.veganland',
      permissions: ['android.permission.CAMERA'],
      edgeToEdgeEnabled: true,
      versionCode: 13,
      // Firebase config — required for FCM (push) and Firebase Analytics.
      // The file is committed at the repo root; EAS picks it up at build time.
      googleServicesFile: isNovaQI ? './google-services.json' : undefined,
    },
    web: {
      favicon: `${assets}/favicon.png`,
    },
    experiments: {
      baseUrl: '',
    },
    plugins: [
      'expo-font',
      ['expo-camera', { cameraPermission: `${B} needs camera access to scan products.` }],
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
          color: isNovaQI ? '#0B1E3F' : '#7CB518',
        },
      ],
      // Firebase Analytics — feeds Google Ads UAC with first_open + custom events.
      // v22 only ships a config plugin in @react-native-firebase/app; analytics
      // is enabled automatically once the app is configured + google-services
      // files are present.
      '@react-native-firebase/app',
      // RN Firebase requires static frameworks + iOS 15.1 deployment target
      [
        'expo-build-properties',
        {
          ios: {
            useFrameworks: 'static',
            deploymentTarget: '15.1',
          },
        },
      ],
      ...fbPlugin,
    ],
    updates: {
      url: `https://u.expo.dev/${isNovaQI ? '08a6532d-79dd-4681-924f-471645e23370' : '64fa402d-0f4c-4582-8879-e032ddaa946e'}`,
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
