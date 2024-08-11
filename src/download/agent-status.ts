import { AccessDeniedException, AgentStatus, DescribeAgentStatusCommand, DescribeAgentStatusCommandOutput, ListAgentStatusesCommand, ListAgentStatusesCommandOutput, ResourceNotFoundException } from "@aws-sdk/client-connect";

import { FileService } from '../services/file-service.js';
import { TDownloadComponentParams } from '../types/index.js';

type TAgentStatus = {
  AgentStatus?: AgentStatus,
};

export async function downloadSpecificAgentStatus({
  connectClient,
  instanceId,
  id: agentStatusId,
  outputDir,
  overrideFile
}: TDownloadComponentParams): Promise<string | null> {
  if (!connectClient) {
    throw new Error('ConnectClient is not provided');
  }
 
  try {
    const describeResponse: DescribeAgentStatusCommandOutput = await connectClient.send(new DescribeAgentStatusCommand({
      InstanceId: instanceId,
      AgentStatusId: agentStatusId
    }));
    
    const agentStatus: AgentStatus | undefined = describeResponse.AgentStatus;
    if (!agentStatus) return null;
    
    const restructuredData: TAgentStatus = {
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
    
    
    const fileName: string | undefined = `${describeResponse.AgentStatus?.Name}`;
    const filePath = FileService.getFileName(outputDir, fileName, '.json', overrideFile);
    FileService.writeJsonToFile(filePath, restructuredData, overrideFile);
    
    return fileName ?? null;
    
  } catch (error) {
    if (error instanceof ResourceNotFoundException) {
      console.warn(`User with ID ${agentStatusId} not found. They may have been deleted.`);
    } else if (error instanceof Error && error.message.includes('Invalid parameter')) {
      console.warn(`Invalid User ID: ${agentStatusId}. Please check the ID and ensure it's correctly formatted.`);
    } else if (error instanceof AccessDeniedException) {
      console.error(`Access denied: You don't have permission to access User ${agentStatusId}.`);
    } else {
      console.error(`Unexpected error downloading Agent Status for User ${agentStatusId}:`, error);
    }

    return null;
  }
}

export async function downloadAllAgentStatuses({
  connectClient,
  instanceId, 
  outputDir,
  overrideFile
}: TDownloadComponentParams): Promise<string[]> {
  if (!connectClient) {
    throw new Error('ConnectClient is not provided');
  }

  const listResponse: ListAgentStatusesCommandOutput = await connectClient.send(new ListAgentStatusesCommand({ InstanceId: instanceId }));

  if (!listResponse.AgentStatusSummaryList || listResponse.AgentStatusSummaryList.length === 0) {
    console.warn('No Users found for this Connect instance.');
    return [];
  }

  const downloadPromises: Promise<string | null>[] = listResponse.AgentStatusSummaryList
    .filter(summary => summary.Id)
    .map(summary => 
      downloadSpecificAgentStatus({
        connectClient,
        instanceId,
        outputDir,
        overrideFile,
        id: summary.Id!,
      }).catch(() => null)
    );
    
  const downloadResults: (string | null)[] = await Promise.all(downloadPromises);

  // Filter out null results (failed downloads) and return successful downloads
  return downloadResults.filter((result): result is string => result !== null);
}