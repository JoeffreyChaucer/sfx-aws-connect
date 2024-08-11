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
    lambdaClient?: LambdaClient;
    instanceId?: string;
    componentType?: string;
    outputDir?: string;
    id?: string;
    overrideFile?: boolean;
    download?: boolean;
  } & TAwsAccessFlags
  
  
export type TComponentType = 'hoursOfOperation' | 'queues' | 'prompts' | 'contactFlows' | 'routingProfiles' | 'lambdaFunctions';

export type EnvironmentVariables = {
  [key: string]: string | undefined;
};

export type Environment = {
  Variables?: EnvironmentVariables;
};

export type TracingConfig = {
  Mode?: string;
};

export type Layer = {
  Arn?: string;
  CodeSize?: number;
};

export type EphemeralStorage = {
  Size?: number;
};

export type SnapStart = {
  ApplyOn?: string;
  OptimizationStatus?: string;
};

export type RuntimeVersionConfig = {
  RuntimeVersionArn?: string;
};

export type LoggingConfig = {
  LogFormat?: string;
  LogGroup?: string;
};

export type LambdaFunctionConfiguration = {
  FunctionName?: string;
  FunctionArn?: string;
  Runtime?: string;
  Role?: string;
  Handler?: string;
  CodeSize?: number;
  Description?: string;
  Timeout?: number;
  MemorySize?: number;
  LastModified?: string;
  CodeSha256?: string;
  Version?: string;
  Environment?: Environment;
  TracingConfig?: TracingConfig;
  RevisionId?: string;
  Layers?: Layer[];
  State?: string;
  LastUpdateStatus?: string;
  PackageType?: string;
  Architectures?: string[];
  EphemeralStorage?: EphemeralStorage;
  SnapStart?: SnapStart;
  RuntimeVersionConfig?: RuntimeVersionConfig;
  LoggingConfig?: LoggingConfig;
};

export type LambdaFunctionCode = {
  RepositoryType?: string;
  Location?: string;
};

export type LambdaFunctionTags = {
  [key: string]: string | undefined;
};

export type TLambdaFunction = {
  Configuration?: LambdaFunctionConfiguration;
  Code?: LambdaFunctionCode;
  Tags?: LambdaFunctionTags;
};

