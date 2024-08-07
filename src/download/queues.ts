import { Queue as AwsQueue, DescribeQueueCommand, ListQueuesCommand } from "@aws-sdk/client-connect";
import * as path from 'node:path';

import { FileService } from '../services/file-service.js';
import { TDownloadComponentParams } from '../types/index.js';

type QueueResponse = {
  Queue?: AwsQueue,
};

export async function downloadSingleQueue({
  connectClient,
  instanceId,
  id,
  outputDir,
  overrideFile
}: TDownloadComponentParams): Promise<string> {
  const describeCommand = new DescribeQueueCommand({
    InstanceId: instanceId,
    QueueId: id
  });
  
  if (!connectClient) {
    throw new Error('ConnectClient is not provided');
  }

  const describeResponse = await connectClient.send(describeCommand);

  if (describeResponse.Queue) {
    
    const restructuredData: QueueResponse = {
      Queue: {
        Name: describeResponse.Queue.Name,
        QueueArn: describeResponse.Queue.QueueArn,
        QueueId: describeResponse.Queue.QueueId,
        Description: describeResponse.Queue.Description,
        OutboundCallerConfig: describeResponse.Queue.OutboundCallerConfig,
        HoursOfOperationId: describeResponse.Queue.HoursOfOperationId,
        MaxContacts: describeResponse.Queue.MaxContacts,
        Status: describeResponse.Queue.Status,
        Tags: describeResponse.Queue.Tags,
        LastModifiedTime: describeResponse.Queue.LastModifiedTime,
        LastModifiedRegion: describeResponse.Queue.LastModifiedRegion || ''
      }
    };
    
    FileService.createDirectory(outputDir);
    const fileName = `${restructuredData.Queue?.Name ?? 'Unknown_Queue'}`;
    const filePath = FileService.getFileName(outputDir, fileName, '.json', overrideFile);
    FileService.writeJsonToFile(filePath, restructuredData, overrideFile);
    return path.basename(filePath);
  }
 
  throw new Error(`Queue with ID ${id} not found.`);
}

export async function downloadAllQueues({
  connectClient,
  instanceId, 
  outputDir,
  overrideFile
}: TDownloadComponentParams): Promise<string[]> {
  if (!connectClient) {
    throw new Error('ConnectClient is not provided');
  }

  const listCommand = new ListQueuesCommand({ InstanceId: instanceId });
  const listResponse = await connectClient.send(listCommand);

  if (!listResponse.QueueSummaryList || listResponse.QueueSummaryList.length === 0) {
    return [];
  }

  FileService.createDirectory(outputDir);

    const downloadPromises = listResponse.QueueSummaryList
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
        return await downloadSingleQueue(downloadConfig);
      } catch {
        return null;
      } // Return null for failed downloads
    });
      
  const downloadResults = await Promise.all(downloadPromises);

  // Filter out null results (failed downloads) and return successful downloads
  const downloadedFiles = downloadResults.filter((result): result is string => result !== null);

  return downloadedFiles;
}