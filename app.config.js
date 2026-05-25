const brand = process.env.BRAND || 'veganland';
const isNovaQI = brand === 'novaqi';

export default {
  expo: {
    name: isNovaQI ? 'NovaQI' : 'VeganLand',
    slug: isNovaQI ? 'novaqi' : 'veganland',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: isNovaQI ? '#1E1B4B' : '#2E7D52',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: isNovaQI ? 'app.novaqi' : 'app.veganland',
      infoPlist: {
        NSCameraUsageDescription: `${isNovaQI ? 'NovaQI' : 'VeganLand'} needs camera access to scan product labels and ingredients.`,
        NSPhotoLibraryUsageDescription: `${isNovaQI ? 'NovaQI' : 'VeganLand'} needs photo library access to analyze product images.`,
        NSPhotoLibraryAddUsageDescription: `${isNovaQI ? 'NovaQI' : 'VeganLand'} saves product scan images to your library.`,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: isNovaQI ? '#1E1B4B' : '#2E7D52',
      },
      package: isNovaQI ? 'app.novaqi' : 'app.veganland',
      permissions: [
        'android.permission.CAMERA',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.RECORD_AUDIO',
      ],
      edgeToEdgeEnabled: true,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    experiments: {
      baseUrl: isNovaQI ? '/novaqi' : '',
    },
    plugins: [
      [
        'expo-camera',
        {
          cameraPermission: `${isNovaQI ? 'NovaQI' : 'VeganLand'} needs camera access to scan products.`,
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: `${isNovaQI ? 'NovaQI' : 'VeganLand'} needs photo access to analyze product images.`,
        },
      ],
    ],
    updates: {
      url: 'https://u.expo.dev/64fa402d-0f4c-4582-8879-e032ddaa946e',
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
    extra: {
      eas: {
        projectId: '64fa402d-0f4c-4582-8879-e032ddaa946e',
      },
    },
  },
};
