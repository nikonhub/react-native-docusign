"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_plugins_1 = require("expo/config-plugins");
const DEFAULT_CAMERA_PERMISSION = 'Allows signing DocuSign documents with your camera and capturing signatures.';
const DEFAULT_PHOTO_PERMISSION = 'Allows selecting photos to attach to DocuSign documents.';
const withDocuSignIos = (config, props) => (0, config_plugins_1.withInfoPlist)(config, (cfg) => {
    var _a, _b, _c, _d;
    cfg.modResults.NSCameraUsageDescription =
        (_b = (_a = props.cameraPermission) !== null && _a !== void 0 ? _a : cfg.modResults.NSCameraUsageDescription) !== null && _b !== void 0 ? _b : DEFAULT_CAMERA_PERMISSION;
    cfg.modResults.NSPhotoLibraryUsageDescription =
        (_d = (_c = props.photoPermission) !== null && _c !== void 0 ? _c : cfg.modResults.NSPhotoLibraryUsageDescription) !== null && _d !== void 0 ? _d : DEFAULT_PHOTO_PERMISSION;
    return cfg;
});
const withDocuSignAndroidPermissions = (config) => {
    const permissions = [
        'android.permission.INTERNET',
        'android.permission.ACCESS_NETWORK_STATE',
        'android.permission.CAMERA',
    ];
    return (0, config_plugins_1.withAndroidManifest)(config, (cfg) => {
        permissions.forEach((permission) => {
            config_plugins_1.AndroidConfig.Permissions.addPermission(cfg.modResults, permission);
        });
        return cfg;
    });
};
const withDocuSignAndroidMavenRepo = (config, props) => {
    var _a;
    const repo = (_a = props.androidMavenRepo) !== null && _a !== void 0 ? _a : 'https://docucdn-a.akamaihd.net/prod/docusignandroidsdk';
    return (0, config_plugins_1.withProjectBuildGradle)(config, (cfg) => {
        if (cfg.modResults.language !== 'groovy') {
            return cfg;
        }
        if (cfg.modResults.contents.includes(repo)) {
            return cfg;
        }
        const mavenBlock = `        maven { url "${repo}" }`;
        const allprojectsRepositoriesRegex = /(allprojects\s*\{[\s\S]*?repositories\s*\{)/;
        if (allprojectsRepositoriesRegex.test(cfg.modResults.contents)) {
            cfg.modResults.contents = cfg.modResults.contents.replace(allprojectsRepositoriesRegex, `$1\n${mavenBlock}`);
        }
        return cfg;
    });
};
const FLAT_DIR_MARKER = 'react-native-docusign-stripped-aar-flatdir';
const withDocuSignAndroidStrippedAarFlatDir = (config) => (0, config_plugins_1.withProjectBuildGradle)(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
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
        cfg.modResults.contents = cfg.modResults.contents.replace(allprojectsRegex, `$1\n${flatDirBlock}$2`);
    }
    return cfg;
});
const withDocuSign = (config, props) => {
    const resolvedProps = props !== null && props !== void 0 ? props : {};
    let updated = config;
    updated = withDocuSignIos(updated, resolvedProps);
    updated = withDocuSignAndroidPermissions(updated);
    updated = withDocuSignAndroidMavenRepo(updated, resolvedProps);
    updated = withDocuSignAndroidStrippedAarFlatDir(updated);
    return updated;
};
exports.default = withDocuSign;
//# sourceMappingURL=index.js.map