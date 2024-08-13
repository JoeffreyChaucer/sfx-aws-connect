import { Command, Flags } from '@oclif/core';

import { downloadAllAgentStatuses, downloadSpecificAgentStatus } from '../download/agent-status.js';
import { downloadAllContactFlows, downloadSpecificContactFlow } from '../download/contact-flows.js';
import { downloadAllHoursOfOperation, downloadSpecificHoursOfOperation } from '../download/hours-of-operation.js'
import { downloadAllLambdaFunctions, downloadSpecificLambdaFunction} from '../download/lambda-functions.js';
import { downloadAllPrompts, downloadSpecificPrompt } from '../download/prompts.js';
import { downloadAllQueues, downloadSpecificQueue } from '../download/queues.js';
import { downloadAllRoutingProfiles, downloadSpecificRoutingProfile } from '../download/routing-profiles.js'
import { AwsService } from '../services/aws-service.js';
import { TComponentType, TDownloadComponentParams } from '../types/index.js';

export default class download extends Command {
    static description: string = 'Download aws components from AWS Connect instance';
    static override examples: string[] = [
      '$ sf-aws-connect download --instanceId 12345678-1234-1234-1234-123456789012 --componentType queues --outputPath ./downloads --region ap-southeast-2 --profile dev',
      '$ sf-aws-connect download --instanceId 12345678-1234-1234-1234-123456789012 --componentType queues:abcdef-1234-5678-90ab-cdef12345678 --outputPath ./downloads --region ap-southeast-2 --accessKeyId YOUR_ACCESS_KEY --secretAccessKey YOUR_SECRET_KEY --secretSessionToken YOUR_SESSION_KEY'
    ]
    
  static override flags = {
    instanceId: Flags.string({
      char: 'i',
      description: 'AWS Connect Instance ID',
      required: true,
    }),
    componentType: Flags.string({
      char: 'c',
      description: 'Component type to download. Use "ComponentType" for all, or "ComponentType:Id" for a single component. Valid types: hoursOfOperation, queues, prompts, contactFlows, routingProfiles, agentStatus, lambdaFunctions',
      required: true,
    }),
    outputDir: Flags.string({
      char: 'o',
      description: 'Output path for the downloaded component(s)',
      required: true,
    }),
    profile: Flags.string({
      char: 'p',
      description: 'AWS profile for SSO',
      exclusive: ['accessKeyId', 'secretAccessKey'],
    }),
    region: Flags.string({
      char: 'r',
      description: 'AWS region',
      default: 'ap-southeast-2',
      required: true
    }),
    overWrite: Flags.boolean({
      description: 'overWrite existing components',
      default: true,
      allowNo: true, // This allows --no-overWrite to be used to set it to false
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
    secretSessionToken: Flags.string({
      char: 't',
      description: 'AWS token session key',
      dependsOn: ['accessKeyId'],
    }),
  };
  
  static summary: string = 'Download components from AWS Connect';
  
  
  async run(): Promise<void> {
    const { flags } = await this.parse(download);

    const config: TDownloadComponentParams = {
      accessKeyId: flags.accessKeyId,
      authMethod: flags.profile ? 'sso' : 'accessKey',
      profile: flags.profile,
      region: flags.region,
      secretAccessKey: flags.secretAccessKey,
      secretSessionToken: flags.secretToken,
      componentType: flags.componentType,
      download: flags.download,
      instanceId: flags.instanceId,
      outputDir:flags.outputDir,
      overWrite:flags.overWrite
    };
    
    const isAuthValid =
    config.profile || (config.accessKeyId && config.secretAccessKey && config.secretSessionToken);

    if (!isAuthValid) {
      this.error('Auth is required: either AWS profile or access key credentials (accessKeyId, secretAccessKey and secretSessionToken) must be provided.', { exit: 1 });
    }
    

    await this.download(config);
  }

  private async download(config: TDownloadComponentParams): Promise<void> {
    const awsService: AwsService = AwsService.getInstance(config);
    const connectClient = await awsService.getConnectClient()
    const lambdaClient = await awsService.getLambdaClient()
    
    try {
      
      if (!config.componentType) {
        this.error('Component type is required', { exit: 1 });
      }

      const [baseType, id] = config.componentType.split(':');
      const validTypes: TComponentType[] = ['hoursOfOperation', 'queues', 'prompts', 'contactFlows', 'routingProfiles', 'agentStatus', 'lambdaFunctions'];
      
      if (!validTypes.includes(baseType as TComponentType)) {
        this.error(
          `Unsupported component type: ${baseType}\n` +
          `Valid types are: ${validTypes.join(', ')}`,
          { exit: 1 }
        );
      }

      await (id && id !== 'Id'
        ? this.downloadSpecificComponent({
          connectClient,
          lambdaClient,
          instanceId: config.instanceId,
          componentType: baseType as TComponentType,
          id,
          outputDir: config.outputDir,
          overWrite: config.overWrite
        })
        : this.downloadAllComponents({
          connectClient,
          lambdaClient,
          instanceId: config.instanceId,
          componentType: baseType as TComponentType,
          outputDir: config.outputDir,
          overWrite: config.overWrite
        })
      );
      
    } catch(error) {
      if(error instanceof Error){
        if (error.name === 'UnrecognizedClientException') {
          this.error('Authentication Error: Please check your AWS credentials and region.');
        } else {
          this.error(`An unexpected error occurred: ${error.message}`);
        }
      }
    }
  }

  private async downloadAllComponents({
    connectClient,
    lambdaClient,
    instanceId,
    componentType,
    outputDir,
    overWrite
  }: TDownloadComponentParams): Promise<void> {

    const config: TDownloadComponentParams={
      connectClient,
      instanceId,
      outputDir, 
      overWrite
    }
    let downloadedFiles: string[];
    switch (componentType) {
      case 'hoursOfOperation': {
        downloadedFiles = await downloadAllHoursOfOperation(config);
        break;
      }

      case 'queues': {
        downloadedFiles = await downloadAllQueues(config);
        break;
      }
      
      case 'contactFlows': {
        downloadedFiles = await downloadAllContactFlows(config);
        break;
      }
      
      case 'prompts': {
        downloadedFiles = await downloadAllPrompts(config);
        break;
      }
      
      case 'routingProfiles': {
        downloadedFiles = await downloadAllRoutingProfiles(config);
        break;
      }
      
      case 'agentStatus': {
        downloadedFiles = await downloadAllAgentStatuses(config);
        break;
      }
      
      case 'lambdaFunctions': {
        downloadedFiles = await downloadAllLambdaFunctions({
          connectClient,
          lambdaClient,
          instanceId,
          outputDir,
          overWrite
        });
        break;
      }
     
      // Add cases for other component types here
      default: {
        throw new Error(`Unsupported component type: ${componentType}`);
      }
    }

    if (downloadedFiles.length === 0) {
      this.log(`No ${componentType}s found for this instance.`);
    } else {
      for (const file of downloadedFiles) this.log(`Downloaded: ${file}`);
      this.log(`All ${componentType}s have been downloaded to ${outputDir}`);
    }
  }

  private async downloadSpecificComponent({
    connectClient,
    lambdaClient,
    instanceId,
    componentType,
    id,
    outputDir,
    overWrite
  }: TDownloadComponentParams): Promise<void> {

    const config: TDownloadComponentParams={
      connectClient,
      instanceId,
      id,
      outputDir, 
      overWrite,
    }
    
    let fileName: string | null;
    
    switch (componentType) {
      case 'hoursOfOperation': {
        fileName = await downloadSpecificHoursOfOperation(config);
        break;
      }

      case 'queues': {
        fileName = await downloadSpecificQueue(config);
        break;
      }
      
      case 'contactFlows': {
        fileName = await downloadSpecificContactFlow(config);
        break;
      }

      case 'prompts': {
        fileName = await downloadSpecificPrompt(config);
        break;
      }
        
      case 'routingProfiles': {
        fileName = await downloadSpecificRoutingProfile(config);
        break;
      }
      
      case 'agentStatus': {
        fileName = await downloadSpecificAgentStatus(config);
        break;
      }
      
      case 'lambdaFunctions': {
        fileName = await downloadSpecificLambdaFunction({
          lambdaClient,
          id,
          outputDir,
          overWrite
        });
        break;
      }
      
      // Add cases for other component types here
      default: {
        throw new Error(`Unsupported component type: ${componentType}`);
      }
    }

    if (fileName) {
      this.log(`Downloaded: ${fileName}`);
      this.log(`${fileName} have been downloaded to ${outputDir}`);
    } else {
      this.log(`No ${componentType}:${id} found for this instance.`);
    }
  }
}