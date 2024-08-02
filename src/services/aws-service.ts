import { ConnectClient } from "@aws-sdk/client-connect";
import { fromSSO } from "@aws-sdk/credential-provider-sso";
import { AwsCredentialIdentity } from "@aws-sdk/types";

import { AwsConfig } from '../types/index.js';

export class AwsService {
  private config: AwsConfig;
  private credentials: AwsCredentialIdentity | undefined;
  private static instance: AwsService;

  private constructor(config: AwsConfig) {
    this.config = config;
  }

  static getInstance(config: AwsConfig): AwsService {
    if (!AwsService.instance) {
      AwsService.instance = new AwsService(config);
    }

    return AwsService.instance;
  }

  async getConnectClient(): Promise<ConnectClient> {
    const credentials = await this.getCredentials();
    return new ConnectClient({ 
      credentials,
      region: this.config.region
    });
  }

  private async getCredentials(): Promise<AwsCredentialIdentity> {
    if (this.credentials) {
      return this.credentials;
    }
  
    if (this.config.authMethod === 'accessKey') {
      if (!this.config.accessKeyId || !this.config.secretAccessKey) {
        throw new Error('Access key ID and secret access key are required for accessKey auth method');
      }

      this.credentials = {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      };
    } else if (this.config.authMethod === 'sso') {
      if (!this.config.profile) {
        throw new Error('Profile name is required for SSO auth method');
      }

      const credentialProvider = fromSSO({ profile: this.config.profile });
      this.credentials = await credentialProvider();
    } else {
      throw new Error('Invalid authentication method');
    }
  
    return this.credentials;
  }
}