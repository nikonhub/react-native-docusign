import {
  AndroidConfig,
  ConfigPlugin,
  WarningAggregator,
  withAndroidManifest,
  withInfoPlist,
  withProjectBuildGradle,
} from 'expo/config-plugins';

const DEFAULT_CAMERA_PERMISSION =
  'Allows signing DocuSign documents with your camera and capturing signatures.';
const DEFAULT_PHOTO_PERMISSION =
  'Allows selecting photos to attach to DocuSign documents.';

export type DocuSignPluginProps = {
  cameraPermission?: string;
  photoPermission?: string;
  androidMavenRepo?: string;
};

const withDocuSignIos: ConfigPlugin<DocuSignPluginProps> = (config, props) =>
  withInfoPlist(config, (cfg) => {
    cfg.modResults.NSCameraUsageDescription =
      props.cameraPermission ??
      cfg.modResults.NSCameraUsageDescription ??
      DEFAULT_CAMERA_PERMISSION;
    cfg.modResults.NSPhotoLibraryUsageDescription =
      props.photoPermission ??
      cfg.modResults.NSPhotoLibraryUsageDescription ??
      DEFAULT_PHOTO_PERMISSION;
    return cfg;
  });

const withDocuSignAndroidPermissions: ConfigPlugin = (config) => {
  const permissions = [
    'android.permission.INTERNET',
    'android.permission.ACCESS_NETWORK_STATE',
    'android.permission.CAMERA',
  ];

  return withAndroidManifest(config, (cfg) => {
    permissions.forEach((permission) => {
      AndroidConfig.Permissions.addPermission(cfg.modResults, permission);
    });
    return cfg;
  });
};

const withDocuSignAndroidMavenRepo: ConfigPlugin<DocuSignPluginProps> = (
  config,
  props,
) => {
  const repo =
    props.androidMavenRepo ??
    'https://docucdn-a.akamaihd.net/prod/docusignandroidsdk';

  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      WarningAggregator.addWarningAndroid(
        'react-native-docusign',
        `android/build.gradle is Kotlin Script (.kts); cannot auto-inject the DocuSign maven repo. Add the following manually inside allprojects.repositories:\n  maven("${repo}")`,
      );
      return cfg;
    }

    if (cfg.modResults.contents.includes(repo)) {
      return cfg;
    }

    const mavenBlock = `        maven { url "${repo}" }`;
    const allprojectsRepositoriesRegex =
      /(allprojects\s*\{[\s\S]*?repositories\s*\{)/;
    if (allprojectsRepositoriesRegex.test(cfg.modResults.contents)) {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        allprojectsRepositoriesRegex,
        `$1\n${mavenBlock}`,
      );
    }

    return cfg;
  });
};

const FLAT_DIR_MARKER = 'react-native-docusign-stripped-aar-flatdir';

const withDocuSignAndroidStrippedAarFlatDir: ConfigPlugin = (config) =>
  withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      WarningAggregator.addWarningAndroid(
        'react-native-docusign',
        'android/build.gradle is Kotlin Script (.kts); cannot auto-inject the stripped sdk-pdf flatDir. Add this inside allprojects:\n  afterEvaluate {\n    rootProject.findProject(":react-native-docusign")?.let { docusignProject ->\n      repositories { flatDir { dirs("${docusignProject.projectDir}/libs") } }\n    }\n  }',
      );
      return cfg;
    }

    if (cfg.modResults.contents.includes(FLAT_DIR_MARKER)) {
      return cfg;
    }

    const flatDirBlock = `  // ${FLAT_DIR_MARKER}: exposes the stripped sdk-pdf AAR bundled with react-native-docusign.
  // The AAR has com.bumptech.glide.GeneratedAppGlideModuleImpl removed to prevent
  // duplicate-class collisions with expo-image and other Glide-based libraries.
  afterEvaluate {
    def docusignProject = rootProject.findProject(':react-native-docusign')
    if (docusignProject != null) {
      repositories {
        flatDir { dirs "\${docusignProject.projectDir}/libs" }
      }
    }
  }`;

    const allprojectsRegex = /(allprojects\s*\{(?:[^{}]|\{[^{}]*\})*)(\n\})/;
    if (allprojectsRegex.test(cfg.modResults.contents)) {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        allprojectsRegex,
        `$1\n${flatDirBlock}$2`,
      );
    }

    return cfg;
  });

const withDocuSign: ConfigPlugin<DocuSignPluginProps | void> = (
  config,
  props,
) => {
  const resolvedProps: DocuSignPluginProps = props ?? {};
  let updated = config;
  updated = withDocuSignIos(updated, resolvedProps);
  updated = withDocuSignAndroidPermissions(updated);
  updated = withDocuSignAndroidMavenRepo(updated, resolvedProps);
  updated = withDocuSignAndroidStrippedAarFlatDir(updated);
  return updated;
};

export default withDocuSign;
