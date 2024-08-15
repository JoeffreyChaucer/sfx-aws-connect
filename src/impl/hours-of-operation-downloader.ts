import { ConnectClient } from "@aws-sdk/client-connect";

import { HoursOfOperation, fetchAllHoursOfOperation, fetchSpecificHoursOfOperation } from '../download/hours-of-operation.js';

export class HoursOfOperationDownloader {
  async downloadComponent(
    connectClient: ConnectClient,
    instanceId: string,
    id?: string,
    name?: string
  ): Promise<HoursOfOperation | HoursOfOperation[] | undefined> {
    if (id || name) {
      return fetchSpecificHoursOfOperation(connectClient, instanceId, id, name);
    }
 
      const allHoursOfOperation = await fetchAllHoursOfOperation(connectClient, instanceId);

      return allHoursOfOperation.filter((item): item is HoursOfOperation => item !== undefined);
    
  }
}