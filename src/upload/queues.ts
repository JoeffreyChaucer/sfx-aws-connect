import { Queue } from '@aws-sdk/client-connect';

import { AwsComponentData, AwsComponentFileReader } from '../services/aws-component-file-reader.js';

interface QueueWrapper extends AwsComponentData {
  Queue: Queue;
}

export async function readQueueConfigurations(directoryPath: string): Promise<QueueWrapper[]> {
  const reader = new AwsComponentFileReader<QueueWrapper>();
  const restructuredConfigs: QueueWrapper[] = [];

  try {
    const queueConfigs = await reader.readComponentFiles(directoryPath, 'Queue');

    if(!queueConfigs){
      console.log('noququuquq')
      return []
    }
    
    
    for (const queueConfig of queueConfigs) {
      const restructuredData: QueueWrapper = {
        Queue: {
          Name: queueConfig.Queue.Name,
          QueueArn: queueConfig.Queue.QueueArn,
          QueueId: queueConfig.Queue.QueueId,
          Description: queueConfig.Queue.Description,
          OutboundCallerConfig: queueConfig.Queue.OutboundCallerConfig,
          HoursOfOperationId: queueConfig.Queue.HoursOfOperationId,
          MaxContacts: queueConfig.Queue.MaxContacts,
          Status: queueConfig.Queue.Status,
          Tags: queueConfig.Queue.Tags,
          LastModifiedTime: queueConfig.Queue.LastModifiedTime,
          LastModifiedRegion: queueConfig.Queue.LastModifiedRegion
        }
      };

      restructuredConfigs.push(restructuredData);
      console.log(JSON.stringify(restructuredData, null, 2));
      console.log('-----------------------------------');
    }

    return restructuredConfigs;
  } catch (error: any) {
    console.error('Error reading Queue configurations:', error.message);
    throw error; // Re-throw the error to allow the caller to handle it
  }
}