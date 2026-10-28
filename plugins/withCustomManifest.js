const { withAndroidManifest, createRunOncePlugin } = require('expo/config-plugins');

const withCustomManifest = (config) => {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest;
    const application = manifest.application?.[0];

    // Ensure tools namespace exists
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    if (application) {
      // Add tools:replace="android:allowBackup" to prevent conflict with libraries that set allowBackup="false"
      const existingReplace = application.$['tools:replace'];
      if (existingReplace) {
        if (!existingReplace.includes('android:allowBackup')) {
          application.$['tools:replace'] = `${existingReplace},android:allowBackup`;
        }
      } else {
        application.$['tools:replace'] = 'android:allowBackup';
      }

      // Ensure BootUpReceiver from react-native-android-notification-listener is removed
      // to prevent crash on boot (ForegroundServiceDidNotStartInTimeException)
      if (!application.receiver) {
        application.receiver = [];
      }
      const hasBootUpReceiver = application.receiver.some(
        (r) => r.$ && r.$['android:name'] === 'com.lesimoes.androidnotificationlistener.BootUpReceiver'
      );
      if (!hasBootUpReceiver) {
        application.receiver.push({
          $: {
            'android:name': 'com.lesimoes.androidnotificationlistener.BootUpReceiver',
            'tools:node': 'remove',
          },
        });
      }
    }

    return config;
  });
};

module.exports = createRunOncePlugin(withCustomManifest, 'withCustomManifest', '1.0.0');

