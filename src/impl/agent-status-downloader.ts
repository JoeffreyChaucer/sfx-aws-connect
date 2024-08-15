import { ConnectClient } from "@aws-sdk/client-connect";

import { AgentStatus, fetchAllAgentStatuses, fetchSpecificAgentStatus } from '../download/agent-status.js';

export class AgentStatusDownloader {
  async downloadComponent(
    connectClient: ConnectClient,
    instanceId: string,
    id?: string,
    name?: string
  ): Promise<AgentStatus | AgentStatus[] | undefined> {
    if (id || name) {
      return fetchSpecificAgentStatus(connectClient, instanceId, id, name);
    }
 
      const allHoursOfOperation = await fetchAllAgentStatuses(connectClient, instanceId);

      return allHoursOfOperation.filter((item): item is AgentStatus => item !== undefined);
    
  }
}