import { AccessDeniedException, DescribeContactFlowCommand, DescribeContactFlowCommandOutput, ContactFlow as IContactFlow, ListContactFlowsCommand, ListContactFlowsCommandOutput, ResourceNotFoundException, } from "@aws-sdk/client-connect";
import path from "node:path";

import { AwsComponentData, AwsComponentFileWriter } from '../services/aws-component-file-writer.js';
import { TDownloadComponentParams } from '../types/index.js';

interface ContactFlow extends AwsComponentData {
  ContactFlow: IContactFlow;
}

export async function downloadSpecificContactFlow({
  connectClient,
  instanceId,
  componentType,
  id: contactFlowId,
  outputDir,
  overWrite
}: TDownloadComponentParams): Promise<string | null> {
  if (!connectClient) {
    throw new Error('ConnectClient is not provided');
  }
  
  let safeOutputDir: string;
  
  const writer = new AwsComponentFileWriter<ContactFlow>();

  if (componentType === 'all') {
    safeOutputDir = path.join(outputDir || process.cwd(), 'contactFlows');
  } else {
    const defaultOutputDir = path.join(process.cwd(), 'metadata', 'contactFlows');
    safeOutputDir = outputDir || defaultOutputDir;
  }

  
  try {
    const describeResponse: DescribeContactFlowCommandOutput = await connectClient.send(new DescribeContactFlowCommand({
      InstanceId: instanceId,
      ContactFlowId: contactFlowId
    }));

    const contactFlow: IContactFlow | undefined = describeResponse.ContactFlow;
    if (!contactFlow) return null;
    
    const restructuredData: ContactFlow = {
      ContactFlow: {
        Name: contactFlow.Name,
        Arn: contactFlow.Arn,
        Id: contactFlow.Id,
        Type: contactFlow.Type,
        State: contactFlow.State,
        Status: contactFlow.Status,
        Description: contactFlow.Description,
        Content: contactFlow.Content,
        Tags: contactFlow.Tags,
      }
    };
    
    const fileName: string | undefined = contactFlow.Name;
    await writer.writeComponentFile(safeOutputDir, restructuredData, overWrite);
    
    return fileName ?? null;
  } catch (error: any) {
    if (error instanceof ResourceNotFoundException) {
      console.warn(`Contact Flow with ID ${contactFlowId} not found. It may have been deleted.`);
    } else if (error instanceof Error && error.message.includes('Invalid parameter')) {
      console.warn(`Invalid Contact flow ID: ${contactFlowId}. Please check the ID and ensure it's correctly formatted.`);
    } else if (error instanceof AccessDeniedException) {
      console.error(`Access denied: You don't have permission to access flow ${contactFlowId}.`);
    } else {
      console.error(`Unexpected error downloading contact flow ${contactFlowId}:`, error.message);

    }

    return null;
  }
}

export async function downloadAllContactFlows({
  connectClient,
  instanceId, 
  outputDir,
  overWrite
}: TDownloadComponentParams): Promise<string[]> {
  
  if (!connectClient) {
    throw new Error('ConnectClient is not provided');
  }

  const listResponse: ListContactFlowsCommandOutput = await connectClient.send(new ListContactFlowsCommand({ InstanceId: instanceId }));

  if (!listResponse.ContactFlowSummaryList || listResponse.ContactFlowSummaryList.length === 0) {
    console.warn('No Contact Flows found for this Connect instance.');
    return [];
  }

  const downloadPromises: Promise<string | null>[] = listResponse.ContactFlowSummaryList
    .filter(summary => summary.Id)
    .map(summary => 
      downloadSpecificContactFlow({
        connectClient,
        instanceId,
        outputDir,
        overWrite,
        id: summary.Id!,
      }).catch(() => null)
    );
      
  const downloadResults: (string | null)[] = await Promise.all(downloadPromises);

  // Filter out null results (failed downloads) and return successful downloads
  return downloadResults.filter((result): result is string => result !== null);
}