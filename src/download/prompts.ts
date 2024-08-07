import { DescribePromptCommand, GetPromptFileCommand, ListPromptsCommand } from "@aws-sdk/client-connect";
import axios from 'axios';
import fs from 'node:fs/promises';
import * as path from 'node:path';

import { FileService } from '../services/file-service.js';
import { TDownloadComponentParams } from '../types/index.js';

type PromptResponse = {
  Prompt?: {
    Name: string;
    PromptId: string;
    PromptArn: string;
  },
};

export async function downloadSinglePrompt({
  connectClient,
  instanceId,
  id,
  outputDir,
  overrideFile
}: TDownloadComponentParams): Promise<string> {
  const describeCommand = new DescribePromptCommand({
    InstanceId: instanceId,
    PromptId: id
  });
  
  if (!connectClient) {
    throw new Error('ConnectClient is not provided');
  }

  const describeResponse = await connectClient.send(describeCommand);

  if (describeResponse.Prompt) {
    const getPromptCommand = new GetPromptFileCommand({
      InstanceId: instanceId,
      PromptId: id
    });
    const getPromptResponse = await connectClient.send(getPromptCommand);
    const presignedUrl = getPromptResponse.PromptPresignedUrl;

    const response = await axios({
      method: 'get',
      url: presignedUrl,
      responseType: 'arraybuffer'
    });

    const restructuredData: PromptResponse = {
      Prompt: {
        Name: describeResponse.Prompt.Name || '',
        PromptId: describeResponse.Prompt.PromptId || '',
        PromptArn: describeResponse.Prompt.PromptARN || '',
      }
    };

    FileService.createDirectory(outputDir);
    const fileName = restructuredData.Prompt?.Name || 'Unknown_Prompt';
    const filePath = FileService.getFileName(outputDir, fileName, '.wav', overrideFile);
    await fs.writeFile(filePath, response.data);

    const jsonFilePath = FileService.getFileName(outputDir, fileName, '.json', overrideFile);
    FileService.writeJsonToFile(jsonFilePath, restructuredData, overrideFile);

    return path.basename(filePath);
  }

  throw new Error(`Prompt with ID ${id} not found.`);
}

export async function downloadAllPrompts({
  connectClient,
  instanceId, 
  outputDir,
  overrideFile
}: TDownloadComponentParams): Promise<string[]> {
  if (!connectClient) {
    throw new Error('ConnectClient is not provided');
  }

  const listCommand = new ListPromptsCommand({ InstanceId: instanceId });
  const listResponse = await connectClient.send(listCommand);

  if (!listResponse.PromptSummaryList || listResponse.PromptSummaryList.length === 0) {
    return [];
  }

  FileService.createDirectory(outputDir);
    
    const downloadPromises = listResponse.PromptSummaryList
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
        return await downloadSinglePrompt(downloadConfig);
      } catch {
        return null;
      } // Return null for failed downloads
    });
      
  const downloadResults = await Promise.all(downloadPromises);

  // Filter out null results (failed downloads) and return successful downloads
  const downloadedFiles = downloadResults.filter((result): result is string => result !== null);

  return downloadedFiles;
}