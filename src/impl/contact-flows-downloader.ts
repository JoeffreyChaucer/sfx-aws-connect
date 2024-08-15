import { ConnectClient } from "@aws-sdk/client-connect";

import { ContactFlow, downloadAllContactFlows, downloadSpecificContactFlow } from '../download/contact-flows.js';

export class ContactFlowDownloader {
  async downloadComponent(
    connectClient: ConnectClient,
    instanceId: string,
    id?: string,
    name?: string
  ): Promise<ContactFlow | ContactFlow[] | undefined> {
    if (id || name) {
      return downloadSpecificContactFlow(connectClient, instanceId, id, name);
    }
 
    const allContactFlows = await downloadAllContactFlows(connectClient, instanceId);

    return allContactFlows.filter((item): item is ContactFlow => item !== undefined);
  }
}