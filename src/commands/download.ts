import { Command, Flags } from '@oclif/core';
import ora from 'ora';

import { DownloaderFactory } from '../impl/downloader-factory.js';
import { AwsComponentFileWriter, WriteResult } from '../services/aws-component-file-writer.js';
import { AwsService } from '../services/aws-service.js';
import { handleAwsError } from '../utils/error-handler.js';

type downloadConfig = {
  profile?: string,
  accessKeyId?: string,
  secretAccessKey?: string,
  secretSessionToken?: string,
  region: string,
  instanceId: string,
  componentType: string,
  name?: string,
  id?: string,
  outputDir?: string,
  overWrite: boolean
}
export default class Download extends Command {
    static description: string = 'Download aws components from AWS Connect instance';
    static override examples: string[] = [
      '$ sf-aws-connect download --instanceId 12345678-1234-1234-1234-123456789012 --componentType queues --outputPath ./downloads --region ap-southeast-2 --profile dev',
      '$ sf-aws-connect download --instanceId 12345678-1234-1234-1234-123456789012 --componentType Queue - --outputPath ./downloads --region ap-southeast-2 --accessKeyId YOUR_ACCESS_KEY --secretAccessKey YOUR_SECRET_KEY --secretSessionToken YOUR_SESSION_KEY'
    ]
    
  static override flags = {
    instanceId: Flags.string({
      description: 'AWS Connect Instance ID',
      required: true,
    }),
    componentType: Flags.string({
      char: 'c',
      description: 'Comptype',
      required: true,
      options: ['All', 'HoursOfOperation', 'Queue', 'Prompt', 'ContactFlow', 'RoutingProfile', 'AgentStatus', 'QuickConnect','lambdaFunctions']
    }),
    name: Flags.string({
      char: 'n',
      description: 'Name Of Component Type',
      exclusive: ['id'],
    }),
    id: Flags.string({
      char: 'i',
      description: 'Name Of Component Type',
      exclusive: ['name'],
    }),
    outputDir: Flags.string({
      char: 'o',
      description: 'Output path for the downloaded component(s)',
    }),
    profile: Flags.string({
      char: 'p',
      description: 'AWS profile for SSO',
      exclusive: ['accessKeyId', 'secretAccessKey', 'secretSessionToken'],
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
    const { flags } = await this.parse(Download);

    const config: downloadConfig = {
      profile: flags.profile,
      accessKeyId: flags.accessKeyId,
      secretAccessKey: flags.secretAccessKey,
      secretSessionToken: flags.secretSessionToken,
      region: flags.region,
      instanceId: flags.instanceId,
      componentType: flags.componentType,
      name: flags.name,
      id: flags.id,
      outputDir: flags.outputDir,
      overWrite: flags.overWrite
    };
    
 

    await this.download(config);
  }

  private async download(config: downloadConfig): Promise<void> {
    const spinner = ora('Initializing AWS Connect client...').start();
    let connectClient;
    try {
      const awsService: AwsService = AwsService.getInstance(config);
      connectClient = await awsService.getConnectClient();
      spinner.succeed('AWS Connect client initialized successfully.');
      console.log(''); 
    } catch (error) {
      spinner.fail('Failed to initialize AWS Connect client.');
      if (error instanceof Error) {
        this.error(`Authentication Error: ${error.message}`);
      }

      return;
    }
  
    spinner.start('Preparing to download components...');
    try {
      const downloader = DownloaderFactory.getDownloader(config.componentType);
      spinner.text = `Fetching ${config.componentType} data from Amazon Connect...`;
  
      const componentData = await downloader.downloadComponent(
        connectClient,
        config.instanceId,
        config.id,
        config.name
      );
  
      if (componentData) {
        spinner.succeed(`Successfully fetched ${config.componentType} data.`);
        spinner.start('Writing data to JSON files...');
        const results = await this.writeDataToJson(config.outputDir || '.', componentData, config.overWrite);
        
        if (results.length > 0) {
          spinner.succeed(`Successfully wrote ${results.length} file(s).`);
        } else {
          spinner.warn('No files were written.');
        }
      } else {
        spinner.warn(`No data found for ${config.componentType}.`);
      }
    } catch (error) {
      spinner.stop(); // Stop the spinner before logging the error
      console.error(handleAwsError(error, config.componentType, config.id || config.name));
      spinner.fail(`Failed to fetch ${config.componentType} data.`);
    }
  }
  
  private async writeDataToJson(outputDir: string, data: any | any[], overWrite: boolean): Promise<WriteResult[]> {
    const writer = new AwsComponentFileWriter<any>();
    const results: WriteResult[] = [];
  
    if (!data) {
      console.warn(`No data found to write.`);
      return results;
    }
  
    const dataArray = Array.isArray(data) ? data : [data];
  
    for (const item of dataArray) {
      const spinner = ora('Writing file...').start();
      try {
        // eslint-disable-next-line no-await-in-loop
        const fileData = await writer.writeComponentFile(outputDir, item, overWrite);
        if (fileData) {
          results.push(fileData);
          spinner.succeed(`${fileData.fileName} is downloaded to ${fileData.filePath}`);
        } else {
          spinner.warn('No file data returned.');
        }
      } catch (error) {
        spinner.fail(`Error writing file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  
    return results;
  }
}