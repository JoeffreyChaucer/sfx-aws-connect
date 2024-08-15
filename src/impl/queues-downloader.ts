import { ConnectClient } from "@aws-sdk/client-connect";

import { Queue, downloadAllQueues, downloadSpecificQueue } from '../download/queues.js';

export class QueueDownloader {
  async downloadComponent(
    connectClient: ConnectClient,
    instanceId: string,
    id?: string,
    name?: string
  ): Promise<Queue | Queue[] | undefined> {
    if (id || name) {
      return downloadSpecificQueue(connectClient, instanceId, id, name);
    }
 
    const allQueues = await downloadAllQueues(connectClient, instanceId);

    return allQueues.filter((item): item is Queue => item !== undefined);
  }
}