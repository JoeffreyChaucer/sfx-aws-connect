import { ConnectClient } from "@aws-sdk/client-connect";

import { Queue, fetchAllQueues, fetchSpecificQueue } from '../download/queues.js';

export class QueueDownloader {
  async downloadComponent(
    connectClient: ConnectClient,
    instanceId: string,
    id?: string,
    name?: string
  ): Promise<Queue | Queue[] | undefined> {
    if (id || name) {
      return fetchSpecificQueue(connectClient, instanceId, id, name);
    }
 
    const allQueues = await fetchAllQueues(connectClient, instanceId);

    return allQueues.filter((item): item is Queue => item !== undefined);
  }
}