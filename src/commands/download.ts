import { Command, Flags } from '@oclif/core';

import { downloadAllFlows, downloadSingleFlow } from '../download/flows.js';
import {downloadAllHoursOfOperation, downloadSingleHoursOfOperation} from '../download/hours-of-operation.js'
import { downloadAllPrompts, downloadSinglePrompt } from '../download/prompts.js';
import { downloadAllQueues, downloadSingleQueue } from '../download/queues.js';
import { AwsService } from '../services/aws-service.js';
import { TComponentType, TDownloadComponentParams } from '../types/index.js';

export default class download  extends Command {
    static description = 'Download aws components from AWS Connect instance';
    static override examples = [
      '$ sf-aws-connect download --instanceId 12345678-1234-1234-1234-123456789012 --componentType queue --outputPath ./downloads --region ap-southeast-2 --profile dev',
      '$ sf-aws-connect download --instanceId 12345678-1234-1234-1234-123456789012 --componentType queue:abcdef-1234-5678-90ab-cdef12345678 --outputPath ./downloads --region ap-southeast-2 --accessKeyId YOUR_ACCESS_KEY --secretAccessKey YOUR_SECRET_KEY'
    ]
    
  static override flags = {
    instanceId: Flags.string({
      char: 'i',
      description: 'AWS Connect Instance ID',
      required: true,
    }),
    componentType: Flags.string({
      char: 'c',
      description: 'Component type to download. Use "Comptype" for all, or "Comptype:Id" for a single component. Valid types: hoursOfOperation, queues, prompts, flows, lambda-functions',
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
    overrideFile: Flags.boolean({
      description: 'Override existing files',
      default: true,
      allowNo: true, // This allows --no-overrideFile to be used to set it to false
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
  
  static summary = 'Download components from AWS Connect';
  
  
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
      overrideFile:flags.overrideFile
    };
    
    const isAuthValid =
    config.profile || (config.accessKeyId && config.secretAccessKey && config.secretSessionToken);

    if (!isAuthValid) {
      this.error('Auth is required: either AWS profile or access key credentials (accessKeyId, secretAccessKey and secretSessionToken) must be provided.', { exit: 1 });
    }
    

    await this.download(config);
  }

  private async download(config: TDownloadComponentParams): Promise<void> {
    const awsService = AwsService.getInstance(config);
    const connectClient = await awsService.getConnectClient();

    try {
      if (!config.componentType) {
        this.error('Component type is required', { exit: 1 });
      }
      
      const [baseType, id] = config.componentType.split(':');
      const validTypes: TComponentType[] = ['hoursOfOperation', 'queues', 'prompts', 'flows', 'lambda-functions'];
      
      if (!validTypes.includes(baseType as TComponentType)) {
        this.error(`Unsupported component type: ${baseType}`, { exit: 1 });
      }

      await (id && id !== 'Id'
        ? this.downloadSingleComponent({
          connectClient,
          instanceId: config.instanceId,
          componentType: baseType as TComponentType,
          id,
          outputDir: config.outputDir,
          overrideFile: config.overrideFile
        })
        : this.downloadAllComponents({
          connectClient,
          instanceId: config.instanceId,
          componentType: baseType as TComponentType,
          outputDir: config.outputDir,
          overrideFile: config.overrideFile
        })
      );
      
    } catch(error: unknown) {
      if(error instanceof Error){
        if (error.name === 'UnrecognizedClientException') {
          this.error('Authentication Error: Please check your AWS credentials and region.');
        } else {
          this.error(`Error downloading component: ${error.message}`);
        }
      }
    }
  }

  private async downloadAllComponents({
    connectClient,
    instanceId,
    componentType,
    outputDir,
    overrideFile
  }: TDownloadComponentParams): Promise<void> {

    const config: TDownloadComponentParams={
      connectClient,
      instanceId,
      outputDir, 
      overrideFile
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
      
      case 'flows': {
        downloadedFiles = await downloadAllFlows(config);
        break;
      }
      
      case 'prompts': {
        downloadedFiles = await downloadAllPrompts(config);
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

  private async downloadSingleComponent({
    connectClient,
    instanceId,
    componentType,
    id,
    outputDir,
    overrideFile
  }: TDownloadComponentParams): Promise<void> {

    const config: TDownloadComponentParams={
      connectClient,
      instanceId,
      id,
      outputDir, 
      overrideFile
    }
    
    let fileName: string;
    
    switch (componentType) {
      case 'hoursOfOperation': {
        fileName = await downloadSingleHoursOfOperation(config);
        break;
      }

      case 'queues': {
        fileName = await downloadSingleQueue(config);
        break;
      }
      
      case 'flows': {
        fileName = await downloadSingleFlow(config);
        break;
      }

      case 'prompts': {
        fileName = await downloadSinglePrompt(config);
        break;
      }
        
        
      // Add cases for other component types here
      default: {
        throw new Error(`Unsupported component type: ${componentType}`);
      }
    }

    this.log(`Downloaded: ${fileName}`);
  }
}