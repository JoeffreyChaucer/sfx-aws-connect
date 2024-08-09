import type { ConnectClient } from "@aws-sdk/client-connect";
import type { LambdaClient } from "@aws-sdk/client-lambda";

export type TAwsAccessFlags = {
    accessKeyId?: string;
    authMethod?: 'accessKey' | 'sso';
    profile?: string;
    region?: string;
    secretAccessKey?: string;
    secretSessionToken?: string;
  };
  
  
export type TDownloadComponentParams = {
    connectClient?: ConnectClient;
    LambdaClient?: LambdaClient;
    instanceId: string;
    componentType?: string;
    outputDir: string;
    id?: string;
    overrideFile?: boolean;
    download?: boolean;
  } & TAwsAccessFlags
  
  
export type TComponentType = 'hoursOfOperation' | 'queues' | 'prompts' | 'flows' | 'routingProfiles' | 'lambda-functions';



