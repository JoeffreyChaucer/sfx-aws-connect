export interface AwsConfig {
    accessKeyId?: string;
    authMethod: 'accessKey' | 'sso';
    profile?: string;
    region: string;
    secretAccessKey?: string;
  };