import { ConnectClient } from "@aws-sdk/client-connect";

import { HoursOfOperation, downloadAllHoursOfOperation, downloadSpecificHoursOfOperation } from '../download/hours-of-operation.js';

export class HoursOfOperationDownloader {
  async downloadComponent(
    connectClient: ConnectClient,
    instanceId: string,
    id?: string,
    name?: string
  ): Promise<HoursOfOperation | HoursOfOperation[] | undefined> {
    if (id || name) {
      return downloadSpecificHoursOfOperation(connectClient, instanceId, id, name);
    }
 
      const allHoursOfOperation = await downloadAllHoursOfOperation(connectClient, instanceId);

      return allHoursOfOperation.filter((item): item is HoursOfOperation => item !== undefined);
    
  }
}