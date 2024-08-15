import type { ConnectClient, DescribeAgentStatusCommandOutput, ListAgentStatusesCommandOutput } from "@aws-sdk/client-connect";

import {
  DescribeAgentStatusCommand,
  AgentStatus as IAgentStatus,
  ListAgentStatusesCommand,
  ResourceNotFoundException
} from "@aws-sdk/client-connect";

export interface AgentStatus {
  AgentStatus: IAgentStatus;
}

export async function fetchSpecificAgentStatus(
  connectClient: ConnectClient,
  instanceId: string,
  agentStatusId?: string,
  name?: string
): Promise<AgentStatus | undefined> {
  let agentStatusIdToUse = agentStatusId;
  
  if (name && !agentStatusId) {
    agentStatusIdToUse = await getIdByName(connectClient, instanceId, name);
    if (!agentStatusIdToUse) {
      throw new ResourceNotFoundException({
        message: `Agent Status with name "${name}" not found.`,
        $metadata: {}
      });
    }
  }
  
  const command: DescribeAgentStatusCommand = new DescribeAgentStatusCommand({
    InstanceId: instanceId,
    AgentStatusId: agentStatusIdToUse
  });
 
  const response: DescribeAgentStatusCommandOutput = await connectClient.send(command);
  
  if(!response.AgentStatus) return undefined
  
  const agentStatus: IAgentStatus = response.AgentStatus
  
  const agentStatusData: AgentStatus = {
    AgentStatus: {
      AgentStatusARN: agentStatus.AgentStatusARN,
      AgentStatusId: agentStatus.AgentStatusId,
      Name: agentStatus.Name,
      Description: agentStatus.Description ,
      Type: agentStatus.Type,
      DisplayOrder: agentStatus.DisplayOrder,
      State: agentStatus.State,
      Tags: agentStatus.Tags,
      LastModifiedTime: agentStatus.LastModifiedTime,
      LastModifiedRegion: agentStatus.LastModifiedRegion
    }
  };

  return agentStatusData;
}

async function getIdByName(connectClient: ConnectClient, instanceId: string, name: string): Promise<string | undefined> {
    const command = new ListAgentStatusesCommand({ InstanceId: instanceId });
    const response: ListAgentStatusesCommandOutput = await connectClient.send(command);

    const agentStatusId = response.AgentStatusSummaryList?.find(status => status.Name === name);

    return agentStatusId?.Id;

}


export async function fetchAllAgentStatuses( 
  connectClient: ConnectClient,
  instanceId: string,
): Promise<(AgentStatus | undefined)[]> {
  
  const command: ListAgentStatusesCommand = new ListAgentStatusesCommand({ InstanceId: instanceId })
  const listResponse: ListAgentStatusesCommandOutput = await connectClient.send(command);

  if (!listResponse.AgentStatusSummaryList || listResponse.AgentStatusSummaryList.length === 0) {
    console.warn('No AgentStatus found for this Connect instance.');
    return [];
  }

  const agentStatus: Promise<AgentStatus | undefined>[] = listResponse.AgentStatusSummaryList
  .filter((AgentStatusSummary) => AgentStatusSummary.Id && AgentStatusSummary.Name)  // Filter out items without an ID and Names
  .map((AgentStatusSummary) =>
    fetchSpecificAgentStatus(
      connectClient,
      instanceId,
      AgentStatusSummary.Id!
    )
  );
  
  const agentStatusData: (AgentStatus | undefined)[] = await Promise.all(agentStatus)

  return agentStatusData
}
