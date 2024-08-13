import { AccessDeniedException, DescribeHoursOfOperationCommand, DescribeHoursOfOperationCommandOutput, HoursOfOperation as IHoursOfOperation, ListHoursOfOperationsCommand, ListHoursOfOperationsCommandOutput, ResourceNotFoundException } from "@aws-sdk/client-connect";
import path from "node:path";

import { AwsComponentData, AwsComponentFileWriter } from '../services/aws-component-file-writer.js';
import { TDownloadComponentParams } from '../types/index.js';

interface HoursOfOperation extends AwsComponentData {
  HoursOfOperation: IHoursOfOperation;
};

export async function downloadSpecificHoursOfOperation({
  connectClient,
  instanceId,
  componentType,
  id: hoursOfOperationId,
  outputDir,
  overWrite
}: TDownloadComponentParams): Promise<string | null> {
  
  if (!connectClient) {
    throw new Error('ConnectClient is not provided');
  }
  
  let safeOutputDir: string;
  
  const writer = new AwsComponentFileWriter<HoursOfOperation>();

  if (componentType === 'all') {
    safeOutputDir = path.join(outputDir || process.cwd(), 'hoursOfOperation');
  } else {
    const defaultOutputDir = path.join(process.cwd(), 'metadata', 'hoursOfOperation');
    safeOutputDir = outputDir || defaultOutputDir;
  }

  try {
    const describeResponse: DescribeHoursOfOperationCommandOutput = await connectClient.send(new DescribeHoursOfOperationCommand({
      InstanceId: instanceId,
      HoursOfOperationId: hoursOfOperationId
    }));
  
    const hoursOfOperation: IHoursOfOperation | undefined = describeResponse.HoursOfOperation;
    if (!hoursOfOperation) return null;
    
    const restructuredData: HoursOfOperation = {
      HoursOfOperation: {
        HoursOfOperationId: hoursOfOperation.HoursOfOperationId,
        HoursOfOperationArn: hoursOfOperation.HoursOfOperationArn,
        Name: hoursOfOperation.Name,
        Description: hoursOfOperation.Description,
        TimeZone: hoursOfOperation.TimeZone,
        Config: hoursOfOperation.Config,
        Tags: hoursOfOperation.Tags,
        LastModifiedTime:hoursOfOperation.LastModifiedTime,
        LastModifiedRegion: hoursOfOperation.LastModifiedRegion
      }
    };
    
    const fileName: string | undefined = hoursOfOperation.Name;
    await writer.writeComponentFile(safeOutputDir, restructuredData, overWrite);
    
    return fileName ?? null;
  } catch (error: any) {
    if (error instanceof ResourceNotFoundException) {
      console.warn(`Hours of operation with ID ${hoursOfOperationId} not found. It may have been deleted.`);
    } else if (error instanceof Error && error.message.includes('Invalid parameter')) {
      console.warn(`Invalid Hours of operation ID: ${hoursOfOperationId}. Please check the ID and ensure it's correctly formatted.`);
    } else if (error instanceof AccessDeniedException) {
      console.error(`Access denied: You don't have permission to access Hours of operation ${hoursOfOperationId}.`);
    } else {
      console.error(`Unexpected error downloading Hours of operation ${hoursOfOperationId}:`, error.mess);
    }

    return null;
 
  }
  
}

export async function downloadAllHoursOfOperation({
  connectClient,
  instanceId, 
  outputDir,
  overWrite
}: TDownloadComponentParams): Promise<string[]> {
  if (!connectClient) {
    throw new Error('ConnectClient is not provided');
  }

  const listResponse: ListHoursOfOperationsCommandOutput = await connectClient.send(new ListHoursOfOperationsCommand({ InstanceId: instanceId }));

  if (!listResponse.HoursOfOperationSummaryList || listResponse.HoursOfOperationSummaryList.length === 0) {
    console.warn('No Hours Of Operation found for this Connect instance.');
    return [];
  }

  const downloadPromises: Promise<string | null>[] = listResponse.HoursOfOperationSummaryList
  .filter(summary => summary.Id)
  .map(summary => 
    downloadSpecificHoursOfOperation({
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