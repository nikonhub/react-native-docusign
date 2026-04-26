import { ConfigPlugin } from 'expo/config-plugins';
export type DocuSignPluginProps = {
    cameraPermission?: string;
    photoPermission?: string;
    androidMavenRepo?: string;
};
declare const withDocuSign: ConfigPlugin<DocuSignPluginProps | void>;
export default withDocuSign;
