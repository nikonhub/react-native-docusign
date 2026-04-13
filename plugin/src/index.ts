import {
  AndroidConfig,
  ConfigPlugin,
  withAndroidManifest,
  withInfoPlist,
  withProjectBuildGradle,
} from 'expo/config-plugins'

const DEFAULT_CAMERA_PERMISSION = 'Allows signing DocuSign documents with your camera and capturing signatures.'
const DEFAULT_PHOTO_PERMISSION = 'Allows selecting photos to attach to DocuSign documents.'

export type DocuSignPluginProps = {
  cameraPermission?: string
  photoPermission?: string
  androidMavenRepo?: string
}

const withDocuSignIos: ConfigPlugin<DocuSignPluginProps> = (config, props) =>
  withInfoPlist(config, (cfg) => {
    cfg.modResults.NSCameraUsageDescription =
      props.cameraPermission ?? cfg.modResults.NSCameraUsageDescription ?? DEFAULT_CAMERA_PERMISSION
    cfg.modResults.NSPhotoLibraryUsageDescription =
      props.photoPermission ?? cfg.modResults.NSPhotoLibraryUsageDescription ?? DEFAULT_PHOTO_PERMISSION
    return cfg
  })

const withDocuSignAndroidPermissions: ConfigPlugin = (config) => {
  const permissions = [
    'android.permission.INTERNET',
    'android.permission.ACCESS_NETWORK_STATE',
    'android.permission.CAMERA',
  ]

  return withAndroidManifest(config, (cfg) => {
    permissions.forEach((permission) => {
      AndroidConfig.Permissions.addPermission(cfg.modResults, permission)
    })
    return cfg
  })
}

const withDocuSignAndroidMavenRepo: ConfigPlugin<DocuSignPluginProps> = (config, props) => {
  const repo = props.androidMavenRepo ?? 'https://maven.docusign.com/'

  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      return cfg
    }

    if (cfg.modResults.contents.includes(repo)) {
      return cfg
    }

    const mavenBlock = `        maven { url "${repo}" }`
    const allprojectsRepositoriesRegex = /(allprojects\s*\{[\s\S]*?repositories\s*\{)/
    if (allprojectsRepositoriesRegex.test(cfg.modResults.contents)) {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        allprojectsRepositoriesRegex,
        `$1\n${mavenBlock}`
      )
    }

    return cfg
  })
}

const withDocuSign: ConfigPlugin<DocuSignPluginProps | void> = (config, props) => {
  const resolvedProps: DocuSignPluginProps = props ?? {}
  let updated = config
  updated = withDocuSignIos(updated, resolvedProps)
  updated = withDocuSignAndroidPermissions(updated)
  updated = withDocuSignAndroidMavenRepo(updated, resolvedProps)
  return updated
}

export default withDocuSign
