import { ConnectClient } from "@aws-sdk/client-connect";

import { QuickConnect, fetchAllQuickConnects, fetchSpecificQuickConnect } from '../download/quick-connect.js';

export class QuickConnectDownloader {
  async downloadComponent(
    connectClient: ConnectClient,
    instanceId: string,
    id?: string,
    name?: string
  ): Promise<QuickConnect | QuickConnect[] | undefined> {
    if (id || name) {
      return fetchSpecificQuickConnect(connectClient, instanceId, id, name);
    }
 
      const allHoursOfOperation = await fetchAllQuickConnects(connectClient, instanceId);

      return allHoursOfOperation.filter((item): item is QuickConnect => item !== undefined);
    
  }
}