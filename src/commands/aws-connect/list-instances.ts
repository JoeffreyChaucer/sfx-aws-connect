import { ListInstancesCommand } from "@aws-sdk/client-connect";
import { Command, Flags } from '@oclif/core';

import { AwsService } from '../../services/aws-service.js';
import { AwsConfig } from '../../types/index.js';

export default class ListInstances extends Command {
  static description = 'This command lists all AWS Connect instances in the specified region';
  static override examples = [
    '$ sf aws-connect list-instances --region ap-southeast-2 --profile dev',
    '$ sf aws-connect list-instances --region ap-southeast-2 --accessKeyId YOUR_ACCESS_KEY --secretAccessKey YOUR_SECRET_KEY'
  ]
  
  static override flags = {
    profile: Flags.string({
      char: 'p',
      description: 'AWS profile for SSO',
      exclusive: ['accessKeyId', 'secretAccessKey'],
    }),
    region: Flags.string({
      char: 'r',
      description: 'AWS region',
      default: 'ap-southeast-2'
    }),
    accessKeyId: Flags.string({
      char: 'k',
      description: 'AWS access key ID',
      exclusive: ['profile'], 
    }),
    secretAccessKey: Flags.string({
      char: 's',
      description: 'AWS secret access key',
      dependsOn: ['accessKeyId'],
    }),
  };

  static summary = 'List all AWS Connect instances';

  async run(): Promise<void> {
    const { flags } = await this.parse(ListInstances);

    const config: AwsConfig = {
      accessKeyId: flags.accessKeyId,
      authMethod: flags.profile ? 'sso' : 'accessKey',
      profile: flags.profile,
      region: flags.region,
      secretAccessKey: flags.secretAccessKey,
    };

    await this.listInstances(config);
  }

  private async listInstances(config: AwsConfig): Promise<void> {
    const awsService = AwsService.getInstance(config);

    try {
      const connectClient = await awsService.getConnectClient();
      const command = new ListInstancesCommand({});
      const response = await connectClient.send(command);

      if (!response.InstanceSummaryList || response.InstanceSummaryList.length === 0) {
        this.log('No Amazon Connect instances found.');
        return;
      }

      console.log('Instances:', response.InstanceSummaryList);
    } catch {
      this.error('Error listing Amazon Connect instances:', { exit: 1 });
    }
  }
}