import { HoursOfOperation as AwsHoursOfOperation, DescribeHoursOfOperationCommand, ListHoursOfOperationsCommand } from "@aws-sdk/client-connect";
import * as path from 'node:path';

import { FileService } from '../services/file-service.js';
import { TDownloadComponentParams } from '../types/index.js';

type HoursOfOperationResponse = {
  HoursOfOperation?: AwsHoursOfOperation,
};

export async function downloadSingleHoursOfOperation({
  connectClient,
  instanceId,
  id,
  outputDir,
  overrideFile
}: TDownloadComponentParams): Promise<string> {
  
  if (!connectClient) {
    throw new Error('ConnectClient is not provided');
  }

  const describeCommand = new DescribeHoursOfOperationCommand({
    InstanceId: instanceId,
    HoursOfOperationId: id
  });
  const describeResponse = await connectClient.send(describeCommand);


  if (describeResponse.HoursOfOperation) {
    
    const lastModifiedTime = describeResponse.HoursOfOperation.LastModifiedTime
    ? new Date(describeResponse.HoursOfOperation.LastModifiedTime)
    : undefined; // or p // Default to ISO format with Zulu time (UTC)

    
    const restructuredData: HoursOfOperationResponse = {
      HoursOfOperation: {
        HoursOfOperationId: describeResponse.HoursOfOperation.HoursOfOperationId,
        HoursOfOperationArn: describeResponse.HoursOfOperation.HoursOfOperationArn,
        Name: describeResponse.HoursOfOperation.Name,
        Description: describeResponse.HoursOfOperation.Description,
        TimeZone: describeResponse.HoursOfOperation.TimeZone,
        Config: describeResponse.HoursOfOperation.Config,
        Tags: describeResponse.HoursOfOperation.Tags,
        LastModifiedTime:lastModifiedTime,
        LastModifiedRegion: describeResponse.HoursOfOperation.LastModifiedRegion || ''
      }
    };
    
    
    FileService.createDirectory(outputDir);
    const fileName = `${restructuredData.HoursOfOperation?.Name ?? 'Unknown_HoursOfOperation'}`;
    const filePath = FileService.getFileName(outputDir, fileName, '.json', overrideFile);
    FileService.writeJsonToFile(filePath, restructuredData, overrideFile);
    return path.basename(filePath);
  }
 
    throw new Error(`Hours of operation with ID ${id} not found.`);
  
}

export async function downloadAllHoursOfOperation({
  connectClient,
  instanceId, 
  outputDir,
  overrideFile
}: TDownloadComponentParams): Promise<string[]> {
  if (!connectClient) {
    throw new Error('ConnectClient is not provided');
  }

  const listCommand = new ListHoursOfOperationsCommand({ InstanceId: instanceId });
  const listResponse = await connectClient.send(listCommand);

  if (!listResponse.HoursOfOperationSummaryList || listResponse.HoursOfOperationSummaryList.length === 0) {
    return [];
  }

  FileService.createDirectory(outputDir);

  const downloadPromises = listResponse.HoursOfOperationSummaryList
  .filter(summary => summary.Id)
  .map(async summary => {
    const downloadConfig: TDownloadComponentParams = {
      connectClient,
      instanceId,
      outputDir,
      overrideFile,
      id: summary.Id!,
    };

    try {
      return await downloadSingleHoursOfOperation(downloadConfig);
    } catch {
      return null;
    } // Return null for failed downloads
  });
    
  const downloadResults = await Promise.all(downloadPromises);

    // Filter out null results (failed downloads) and return successful downloads
  const downloadedFiles = downloadResults.filter((result): result is string => result !== null);
   

  return downloadedFiles;
}