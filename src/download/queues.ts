import { AccessDeniedException, Queue as AwsQueue, DescribeQueueCommand, ListQueuesCommand, ListQueuesCommandOutput, ResourceNotFoundException } from "@aws-sdk/client-connect";

import { FileService } from '../services/file-service.js';
import { TDownloadComponentParams } from '../types/index.js';

type QueueResponse = {
  Queue?: AwsQueue,
};

export async function downloadSpecificQueue({
  connectClient,
  instanceId,
  id: queueId,
  outputDir,
  overrideFile
}: TDownloadComponentParams): Promise<string | null> {
  if (!connectClient) {
    throw new Error('ConnectClient is not provided');
  }

  try {
    const describeResponse = await connectClient.send(new DescribeQueueCommand({
      InstanceId: instanceId,
      QueueId: queueId
    }));

    const queue = describeResponse.Queue;
    if (!queue) return null;

    const restructuredData: QueueResponse = {
      Queue: {
        Name: queue.Name,
        QueueArn: queue.QueueArn,
        QueueId: queue.QueueId,
        Description: queue.Description,
        OutboundCallerConfig: queue.OutboundCallerConfig,
        HoursOfOperationId: queue.HoursOfOperationId,
        MaxContacts: queue.MaxContacts,
        Status: queue.Status,
        Tags: queue.Tags,
        LastModifiedTime: queue.LastModifiedTime,
        LastModifiedRegion: queue.LastModifiedRegion
      }
    };
    
    const fileName = queue.Name ?? 'Unknown_Queue';
    const filePath = FileService.getFileName(outputDir, fileName, '.json', overrideFile);
    FileService.writeJsonToFile(filePath, restructuredData, overrideFile);
    
    return fileName ?? null;
  } catch (error) {
    
    if (error instanceof ResourceNotFoundException) {
      console.warn(`Queue with ID ${queueId} not found. It may have been deleted.`);
    } else if (error instanceof Error && error.message.includes('Invalid parameter')) {
      console.warn(`Invalid queue ID: ${queueId}. Please check the ID and ensure it's correctly formatted.`);
    } else if (error instanceof AccessDeniedException) {
      console.error(`Access denied: You don't have permission to access queue ${queueId}.`);
    } else {
      console.error(`Unexpected error downloading queue ${queueId}:`, error);
    }

    return null;
  }
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

  const listResponse: ListQueuesCommandOutput = await connectClient.send(new ListQueuesCommand({ InstanceId: instanceId }));

  if (!listResponse.QueueSummaryList || listResponse.QueueSummaryList.length === 0) {
    console.warn('No Queues found for this Connect instance.');
    return [];
  }

  const downloadPromises = listResponse.QueueSummaryList
    .filter(summary => summary.Id)
    .map(summary => 
      downloadSpecificQueue({
        connectClient,
        instanceId,
        outputDir,
        overrideFile,
        id: summary.Id!,
      }).catch(() => null)
    );
      
  const downloadResults = await Promise.all(downloadPromises);

  // Filter out null results (failed downloads) and return successful downloads
  return downloadResults.filter((result): result is string => result !== null);
}