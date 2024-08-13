import { AccessDeniedException, Queue as AwsQueue, DescribeQueueCommand, ListQueuesCommand, ListQueuesCommandOutput, QueueSummary, ResourceNotFoundException } from "@aws-sdk/client-connect";
import path from "node:path";

import { AwsComponentData, AwsComponentFileWriter } from '../services/aws-component-file-writer.js';
import { TDownloadComponentParams } from '../types/index.js';

interface Queue extends AwsComponentData {
  Queue: AwsQueue;
}

export async function downloadSpecificQueue({
  connectClient,
  instanceId,
  componentType,
  id: queueId,
  outputDir,
  overWrite
}: TDownloadComponentParams): Promise<string | null> {
  if (!connectClient) {
    throw new Error('ConnectClient is not provided');
  }
  
  let safeOutputDir: string;
  
  const writer = new AwsComponentFileWriter<Queue>();
  
  if (componentType === 'all') {
    safeOutputDir = path.join(outputDir || process.cwd(), 'queues');
  } else {
    const defaultOutputDir = path.join(process.cwd(), 'metadata', 'queues');
    safeOutputDir = outputDir || defaultOutputDir;
  }
  
  try {
    const describeResponse = await connectClient.send(new DescribeQueueCommand({
      InstanceId: instanceId,
      QueueId: queueId
    }));

    const queue: AwsQueue | undefined = describeResponse.Queue;
    if (!queue) return null;

    const restructuredData: Queue = {
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
    await writer.writeComponentFile(safeOutputDir, restructuredData, overWrite);

    return fileName ?? null;
  } catch (error: any) {
    
    if (error instanceof ResourceNotFoundException) {
      console.warn(`Queue with ID ${queueId} not found. It may have been deleted.`);
    } else if (error instanceof Error && error.message.includes('Invalid parameter')) {
      console.warn(`Invalid queue ID: ${queueId}. Please check the ID and ensure it's correctly formatted.`);
    } else if (error instanceof AccessDeniedException) {
      console.error(`Access denied: You don't have permission to access queue ${queueId}.`);
    } else {
      console.error(`Unexpected error downloading queue ${queueId}:`, error.message);
    }

    return null;
  }
}

export async function downloadAllQueues({
  connectClient,
  instanceId, 
  componentType,
  outputDir,
  overWrite
}: TDownloadComponentParams): Promise<string[]> {
  if (!connectClient) {
    throw new Error('ConnectClient is not provided');
  }

  const listResponse: ListQueuesCommandOutput = await connectClient.send(new ListQueuesCommand({ InstanceId: instanceId }));

  const queues: QueueSummary[] | undefined = listResponse.QueueSummaryList;

  if (!queues || queues.length === 0) {
    console.warn('No Queues found for this Connect instance.');
    return [];
  }

  const downloadPromises = queues
    .filter(summary =>
      summary.Id && 
      summary.Name)
    .map(summary => 
      downloadSpecificQueue({
        connectClient,
        instanceId,
        componentType,
        outputDir,
        overWrite,
        id: summary.Id!,
      }).catch(() => null)
    );
      
  const downloadResults = await Promise.all(downloadPromises);

  // Filter out null results (failed downloads) and return successful downloads
  return downloadResults.filter((result): result is string => result !== null);
}