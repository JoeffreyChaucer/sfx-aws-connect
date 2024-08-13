import { AccessDeniedException, DescribeAgentStatusCommand, DescribeAgentStatusCommandOutput,  AgentStatus as IAgentStatus, ListAgentStatusesCommand, ListAgentStatusesCommandOutput, ResourceNotFoundException } from "@aws-sdk/client-connect";
import path from "node:path";

import { AwsComponentData, AwsComponentFileWriter } from '../services/aws-component-file-writer.js';
import { TDownloadComponentParams } from '../types/index.js';


interface AgentStatus extends AwsComponentData {
  AgentStatus: IAgentStatus;
}

export async function downloadSpecificAgentStatus({
  connectClient,
  instanceId,
  componentType,
  id: agentStatusId,
  outputDir,
  overWrite
}: TDownloadComponentParams): Promise<string | null> {
  if (!connectClient) {
    throw new Error('ConnectClient is not provided');
  }

  let safeOutputDir: string;
  
  const writer = new AwsComponentFileWriter<AgentStatus>();

  if (componentType === 'all') {
    safeOutputDir = path.join(outputDir || process.cwd(), 'agentStatuses');
  } else {
    const defaultOutputDir = path.join(process.cwd(), 'metadata', 'agentStatuses');
    safeOutputDir = outputDir || defaultOutputDir;
  }

  try {
    const describeResponse: DescribeAgentStatusCommandOutput = await connectClient.send(new DescribeAgentStatusCommand({
      InstanceId: instanceId,
      AgentStatusId: agentStatusId
    }));
    
    const agentStatus: IAgentStatus | undefined = describeResponse.AgentStatus;
    if (!agentStatus) return null;
    
    const restructuredData: AgentStatus = {
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
    await writer.writeComponentFile(safeOutputDir, restructuredData, overWrite);
    
    return fileName ?? null;
    
  } catch (error: any) {
    if (error instanceof ResourceNotFoundException) {
      console.warn(`Agent Status with ID ${agentStatusId} not found. They may have been deleted.`);
    } else if (error instanceof Error && error.message.includes('Invalid parameter')) {
      console.warn(`Invalid Agent Status: ${agentStatusId}. Please check the ID and ensure it's correctly formatted.`);
    } else if (error instanceof AccessDeniedException) {
      console.error(`Access denied: You don't have permission to access User ${agentStatusId}.`);
    } else {
      console.error(`Unexpected error downloading Agent Status for User ${agentStatusId}:`, error.message);
    }

    return null;
  }
}

export async function downloadAllAgentStatuses({
  connectClient,
  instanceId,
  componentType,
  outputDir,
  overWrite
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
    .filter(summary => 
      summary.Id && 
      summary.Name)
    .map(summary => 
      downloadSpecificAgentStatus({
        connectClient,
        instanceId,
        componentType,
        outputDir,
        overWrite,
        id: summary.Id!,
      }).catch(() => null)
    );
    
  const downloadResults: (string | null)[] = await Promise.all(downloadPromises);

  // Filter out null results (failed downloads) and return successful downloads
  return downloadResults.filter((result): result is string => result !== null);
}