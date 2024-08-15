import { ConnectClient } from "@aws-sdk/client-connect";

import { ContactFlow, fetchAllContactFlows, fetchSpecificContactFlow } from '../download/contact-flows.js';

export class ContactFlowDownloader {
  async downloadComponent(
    connectClient: ConnectClient,
    instanceId: string,
    id?: string,
    name?: string
  ): Promise<ContactFlow | ContactFlow[] | undefined> {
    if (id || name) {
      return fetchSpecificContactFlow(connectClient, instanceId, id, name);
    }
 
    const allContactFlows = await fetchAllContactFlows(connectClient, instanceId);

    return allContactFlows.filter((item): item is ContactFlow => item !== undefined);
  }
}