import { ConnectClient, } from "@aws-sdk/client-connect";
import { LambdaClient } from "@aws-sdk/client-lambda";
import { fromSSO } from "@aws-sdk/credential-provider-sso";
import { AwsCredentialIdentity } from "@aws-sdk/types";

type awsConnectConfig = {
  profile?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
};


export class AwsService {
  private config: awsConnectConfig
  private credentials?: AwsCredentialIdentity
  private static instance: AwsService;

  private constructor(config: awsConnectConfig) {
    this.config = config;
  }

  static getInstance(config: awsConnectConfig): AwsService {
    if (!AwsService.instance) {
      AwsService.instance = new AwsService(config);
    }

    return AwsService.instance;
  }

  async getConnectClient(): Promise<ConnectClient> {
    const credentials: AwsCredentialIdentity = await this.getCredentials();
    return new ConnectClient({ 
      credentials,
      region: this.config.region
    });
  }
  
  async getLambdaClient(): Promise<LambdaClient> {
    const credentials: AwsCredentialIdentity = await this.getCredentials();
    return new LambdaClient({ 
      credentials,
      region: this.config.region
    });
  }


  private async getCredentials(): Promise<AwsCredentialIdentity> {
    if (this.credentials) {
      return this.credentials;
    }
  
    if (this.config.profile) {
      try {
        const credentialProvider = fromSSO({ profile: this.config.profile });
        this.credentials = await credentialProvider();
        return this.credentials;
      } catch (error: any) {
        console.error("Error getting SSO credentials:", error.message);
        throw new Error("Failed to retrieve SSO credentials. Please ensure you're logged in with 'aws sso login'.");
      }
    } else if (this.config.accessKeyId && this.config.secretAccessKey) {
      this.credentials = {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
        sessionToken: this.config.sessionToken
      };
      return this.credentials;
    } else {
      throw new Error("No valid credentials provided. Please specify either an SSO profile or access key credentials.");
    }
  }
}