import { ConnectClient } from "@aws-sdk/client-connect";

import { AgentStatus, downloadAllAgentStatuses, downloadSpecificAgentStatus } from '../download/agent-status.js';

export class AgentStatusDownloader {
  async downloadComponent(
    connectClient: ConnectClient,
    instanceId: string,
    id?: string,
    name?: string
  ): Promise<AgentStatus | AgentStatus[] | undefined> {
    if (id || name) {
      return downloadSpecificAgentStatus(connectClient, instanceId, id, name);
    }
 
      const allHoursOfOperation = await downloadAllAgentStatuses(connectClient, instanceId);

      return allHoursOfOperation.filter((item): item is AgentStatus => item !== undefined);
    
  }
}