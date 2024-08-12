import { AccessDeniedException, DescribePromptCommand, DescribePromptCommandOutput, GetPromptFileCommand, GetPromptFileCommandOutput, Prompt as IPrompt, ListPromptsCommand, ListPromptsCommandOutput, ResourceNotFoundException } from "@aws-sdk/client-connect";
import axios, { AxiosResponse } from 'axios';
import path from "node:path";

import { AwsComponentData, AwsComponentFileWriter } from '../services/aws-component-file-writer.js';
import { TDownloadComponentParams } from '../types/index.js';

interface Prompt extends AwsComponentData {
  Prompt: IPrompt;
}


export async function downloadSpecificPrompt({
  connectClient,
  instanceId,
  id: promptId,
  outputDir,
  overWrite
}: TDownloadComponentParams): Promise<string | null> {
  if (!connectClient) {
    throw new Error('ConnectClient is not provided');
  }
  
  const writer = new AwsComponentFileWriter<Prompt>();
  const defaultOutputDir = path.join(process.cwd(), 'prompts');
  const safeOutputDir = outputDir || defaultOutputDir;

  try {
    const describeResponse: DescribePromptCommandOutput = await connectClient.send(new DescribePromptCommand({
      InstanceId: instanceId,
      PromptId: promptId
    }));

    const prompt: IPrompt | undefined = describeResponse.Prompt;
    if (!prompt) return null;
    
    const restructuredData: Prompt = {
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

    if(!prompt.Name){
      return null;
    }

    const fileName: string = prompt.Name;
    await writer.writeComponentFile(safeOutputDir, restructuredData, overWrite);
    
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


    await writer.writeBinaryFile(safeOutputDir, fileName, Buffer.from(response.data), overWrite ?? false);


    return fileName ?? null;
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
  overWrite
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
        overWrite,
        id: summary.Id!,
      }).catch(() => null)
    );
      
  const downloadResults: (string | null)[] = await Promise.all(downloadPromises);

  // Filter out null results (failed downloads) and return successful downloads
  return downloadResults.filter((result): result is string => result !== null);
}