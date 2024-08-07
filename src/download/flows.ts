import { ContactFlow, DescribeContactFlowCommand, ListContactFlowsCommand } from "@aws-sdk/client-connect";
import * as path from 'node:path';

import { FileService } from '../services/file-service.js';
import { TDownloadComponentParams } from '../types/index.js';

type ContactFlowResponse = {
  ContactFlow?: ContactFlow,
};

export async function downloadSingleFlow({
  connectClient,
  instanceId,
  id,
  outputDir,
  overrideFile
}: TDownloadComponentParams): Promise<string> {
  if (!connectClient) {
    throw new Error('ConnectClient is not provided');
  }

  const describeCommand = new DescribeContactFlowCommand({
    InstanceId: instanceId,
    ContactFlowId: id
  });
  const describeResponse = await connectClient.send(describeCommand);

  if (describeResponse.ContactFlow) {
    
    const restructuredData: ContactFlowResponse = {
      ContactFlow: {
        Name: describeResponse.ContactFlow.Name,
        Arn: describeResponse.ContactFlow.Arn,
        Id: describeResponse.ContactFlow.Id,
        Type: describeResponse.ContactFlow.Type,
        State: describeResponse.ContactFlow.State,
        Status: describeResponse.ContactFlow.Status,
        Description: describeResponse.ContactFlow.Description,
        Content: describeResponse.ContactFlow.Content,
        Tags: describeResponse.ContactFlow.Tags,
      }
    };
    
    FileService.createDirectory(outputDir);
    const fileName = `${restructuredData.ContactFlow?.Name ?? 'Unknown_Flow'}`;
    const filePath = FileService.getFileName(outputDir, fileName, '.json', overrideFile);
    FileService.writeJsonToFile(filePath, restructuredData, overrideFile);
    return path.basename(filePath);
  }
 
  throw new Error(`Contact Flow with ID ${id} not found.`);
}

export async function downloadAllFlows({
  connectClient,
  instanceId, 
  outputDir,
  overrideFile
}: TDownloadComponentParams): Promise<string[]> {
  
  if (!connectClient) {
    throw new Error('ConnectClient is not provided');
  }

  const listCommand = new ListContactFlowsCommand({ InstanceId: instanceId });
  const listResponse = await connectClient.send(listCommand);

  if (!listResponse.ContactFlowSummaryList || listResponse.ContactFlowSummaryList.length === 0) {
    return [];
  }

  FileService.createDirectory(outputDir);
  
 

  const downloadPromises = listResponse.ContactFlowSummaryList
    .filter(summary => summary.Id)
    .map(async summary => {
      const downloadConfig: TDownloadComponentParams = {
        connectClient,
        instanceId,
        outputDir,
        overrideFile,
        id: summary.Id!,
      };

      try {
        return await downloadSingleFlow(downloadConfig);
      } catch {
        return null;
      } // Return null for failed downloads
    });

  const downloadResults = await Promise.all(downloadPromises);

  // Filter out null results (failed downloads) and return successful downloads
  const downloadedFiles = downloadResults.filter((result): result is string => result !== null);

  return downloadedFiles;
}