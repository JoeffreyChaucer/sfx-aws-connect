import type { ConnectClient } from "@aws-sdk/client-connect";

import { 
  DescribeQueueCommand, 
  DescribeQueueCommandOutput,  
  Queue as IQueue,
  ListQueuesCommand, 
  ListQueuesCommandOutput, 
  ResourceNotFoundException 
} from "@aws-sdk/client-connect";

export interface Queue {
  Queue: IQueue;
}

export async function fetchSpecificQueue(
  connectClient: ConnectClient,
  instanceId: string,
  queueId?: string,
  name?: string
): Promise<Queue | undefined> {
  let queueIdToUse = queueId;
  
  if (name && !queueId) {
    queueIdToUse = await getIdByName(connectClient, instanceId, name);
    if (!queueIdToUse) {
      throw new ResourceNotFoundException({
        message: `Queue with name "${name}" not found.`,
        $metadata: {}
      });
    }
  }
  
  const command: DescribeQueueCommand = new DescribeQueueCommand({
    InstanceId: instanceId,
    QueueId: queueIdToUse
  });
 
  const response: DescribeQueueCommandOutput = await connectClient.send(command);
  if(!response.Queue) return undefined;
  
  const queue: IQueue = response.Queue;
  
  const queueData: Queue = {
    Queue: {
      Name: queue.Name,
      QueueId: queue.QueueId,
      QueueArn: queue.QueueArn,
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
  
  return queueData;
}

async function getIdByName(connectClient: ConnectClient, instanceId: string, name: string): Promise<string | undefined> {
    const command = new ListQueuesCommand({ InstanceId: instanceId });
    const response: ListQueuesCommandOutput = await connectClient.send(command);

    const queueId = response.QueueSummaryList?.find(queue => queue.Name === name);

    return queueId?.Id;
}

export async function fetchAllQueues( 
  connectClient: ConnectClient,
  instanceId: string,
): Promise<(Queue | undefined)[]> {
  
  const command: ListQueuesCommand = new ListQueuesCommand({ InstanceId: instanceId })
  const listResponse: ListQueuesCommandOutput = await connectClient.send(command);

  if (!listResponse.QueueSummaryList || listResponse.QueueSummaryList.length === 0) {
    console.warn('No Queues found for this Connect instance.');
    return [];
  }

  const queues: Promise<Queue | undefined>[] = listResponse.QueueSummaryList
  .filter((QueueSummary) => QueueSummary.Id && QueueSummary.Name)  // Filter out items without an ID and Names
  .map((QueueSummary) =>
    fetchSpecificQueue(
      connectClient,
      instanceId,
      QueueSummary.Id!
    )
  );
  
  const queueData: (Queue | undefined)[] = await Promise.all(queues)

  return queueData
}