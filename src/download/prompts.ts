import { AccessDeniedException, DescribePromptCommand, DescribePromptCommandOutput, GetPromptFileCommand, GetPromptFileCommandOutput, ListPromptsCommand, ListPromptsCommandOutput, Prompt, ResourceNotFoundException } from "@aws-sdk/client-connect";
import axios, { AxiosResponse } from 'axios';

import { FileService } from '../services/file-service.js';
import { TDownloadComponentParams } from '../types/index.js';

type TPrompt = {
  Prompt?: Prompt
};

export async function downloadSpecificPrompt({
  connectClient,
  instanceId,
  id: promptId,
  outputDir,
  overrideFile
}: TDownloadComponentParams): Promise<string | null> {
  if (!connectClient) {
    throw new Error('ConnectClient is not provided');
  }

  try {
    const describeResponse: DescribePromptCommandOutput = await connectClient.send(new DescribePromptCommand({
      InstanceId: instanceId,
      PromptId: promptId
    }));

    const prompt: Prompt | undefined = describeResponse.Prompt;
    if (!prompt) return null;
    
    const restructuredData: TPrompt = {
      Prompt: {
        Name: prompt.Name,
        PromptId: prompt.PromptId,
        PromptARN: prompt.PromptARN,
        Description: prompt.Description,
        Tags: prompt.Tags,
        LastModifiedTime: prompt.LastModifiedTime,
        LastModifiedRegion: prompt.LastModifiedRegion
      }
    };

    const fileName: string | undefined = prompt.Name;
    const safeOutputDir: string = outputDir ?? './prompts';
    
    const jsonFilePath: string = FileService.getFileName(safeOutputDir, fileName, '.json', overrideFile);
    FileService.writeJsonToFile(jsonFilePath, restructuredData, overrideFile)
    
    const getPromptResponse: GetPromptFileCommandOutput = await connectClient.send(new GetPromptFileCommand({
      InstanceId: instanceId,
      PromptId: promptId
    }));
    
    const presignedUrl: string | undefined = getPromptResponse.PromptPresignedUrl;

    const response: AxiosResponse = await axios({
      method: 'get',
      url: presignedUrl,
      responseType: 'arraybuffer'
    });

    const filePath: string = FileService.getFileName(outputDir, fileName, '.wav', overrideFile);
    const savedFileName = FileService.writeBinaryToFile(filePath, response.data, overrideFile);

    return savedFileName;
  } catch (error) {
    
    if (error instanceof ResourceNotFoundException) {
      console.warn(`Prompt with ID ${promptId} not found. It may have been deleted.`);
    } else if (error instanceof Error && error.message.includes('Invalid parameter')) {
      console.warn(`Invalid prompt ID: ${promptId}. Please check the ID and ensure it's correctly formatted.`);
    } else if (error instanceof AccessDeniedException) {
      console.error(`Access denied: You don't have permission to access prompt ${promptId}.`);
    } else {
      console.error(`Unexpected error downloading prompt ${promptId}:`, error);
    }

    return null
  }
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
  
  const listResponse: ListPromptsCommandOutput = await connectClient.send(new ListPromptsCommand({ InstanceId: instanceId }));

  if (!listResponse.PromptSummaryList || listResponse.PromptSummaryList.length === 0) {
    console.warn('No Prompts found for this Connect instance.');
    return [];
  }

  const downloadPromises: Promise<string | null>[] = listResponse.PromptSummaryList
    .filter(summary => summary.Id)
    .map(summary => 
      downloadSpecificPrompt({
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