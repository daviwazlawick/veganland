const brand = process.env.BRAND || process.env.EXPO_PUBLIC_BRAND || 'veganland';
const isNovaQI = brand === 'novaqi';

const B = isNovaQI ? 'NovaQI' : 'VeganLand';
const assets = isNovaQI ? './assets/novaqi' : './assets';

export default {
  expo: {
    name: B,
    slug: isNovaQI ? 'novaqi' : 'veganland',
    version: '1.0.6', // NEVER bump without a new native build — runtimeVersion = appVersion
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
      infoPlist: {
        NSCameraUsageDescription: `${B} needs camera access to scan product labels and ingredients.`,
        NSPhotoLibraryUsageDescription: `${B} needs photo library access to analyze product images.`,
        NSPhotoLibraryAddUsageDescription: `${B} saves product scan images to your library.`,
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
      versionCode: 8,
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
