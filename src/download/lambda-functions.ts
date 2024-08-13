import { AccessDeniedException, ListLambdaFunctionsCommand, ListLambdaFunctionsCommandOutput } from "@aws-sdk/client-connect";
import { GetFunctionCommand, GetFunctionCommandOutput, ResourceNotFoundException } from "@aws-sdk/client-lambda";
import axios, { AxiosResponse } from "axios";
import path from "node:path";

import { AwsComponentFileWriter } from '../services/aws-component-file-writer.js';
import { TDownloadComponentParams, TLambdaFunction } from '../types/index.js';

  

type TLambda = {
  LambdaFunction?: TLambdaFunction
}

export async function downloadSpecificLambdaFunction({
  lambdaClient,
  id: funcArn,
  componentType,
  outputDir,
  overWrite,
}: TDownloadComponentParams): Promise<string | null> {
  if (!lambdaClient) {
    throw new Error('LambdaClient is not provided');
  }
  
  let safeOutputDir: string;
  
  const writer = new AwsComponentFileWriter<TLambda>();

  if (componentType === 'all') {
    safeOutputDir = path.join(outputDir || process.cwd(), 'lambdaFunctions');
  } else {
    const defaultOutputDir = path.join(process.cwd(), 'metadata', 'lambdaFunctions');
    safeOutputDir = outputDir || defaultOutputDir;
  }

  try {
    const lambdaFunctions: GetFunctionCommandOutput = await lambdaClient.send(new GetFunctionCommand({ FunctionName: funcArn }));
    if (!lambdaFunctions || !lambdaFunctions.Configuration) return null;


    const restructuredData: TLambda = {
      LambdaFunction: {
        Configuration: {
          FunctionName: lambdaFunctions.Configuration?.FunctionName,
          FunctionArn: lambdaFunctions.Configuration?.FunctionArn,
          Runtime: lambdaFunctions.Configuration?.Runtime,
          Role: lambdaFunctions.Configuration?.Role,
          Handler: lambdaFunctions.Configuration?.Handler,
          CodeSize: lambdaFunctions.Configuration?.CodeSize,
          Description: lambdaFunctions.Configuration?.Description,
          Timeout: lambdaFunctions.Configuration?.Timeout,
          MemorySize: lambdaFunctions.Configuration?.MemorySize,
          LastModified: lambdaFunctions.Configuration?.LastModified,
          CodeSha256: lambdaFunctions.Configuration?.CodeSha256,
          Version: lambdaFunctions.Configuration?.Version,
          Environment: lambdaFunctions.Configuration?.Environment,
          TracingConfig:lambdaFunctions.Configuration?.TracingConfig,
          RevisionId: lambdaFunctions.Configuration?.RevisionId,
          Layers: lambdaFunctions.Configuration?.Layers,
          State: lambdaFunctions.Configuration?.State,
          LastUpdateStatus: lambdaFunctions.Configuration?.LastUpdateStatus,
          PackageType: lambdaFunctions.Configuration?.PackageType,
          Architectures: lambdaFunctions.Configuration?.Architectures,
          EphemeralStorage: lambdaFunctions.Configuration?.EphemeralStorage,
          SnapStart: lambdaFunctions.Configuration?.SnapStart,
          RuntimeVersionConfig: lambdaFunctions.Configuration?.RuntimeVersionConfig,
          LoggingConfig:lambdaFunctions.Configuration?.LoggingConfig
        },
        Tags: lambdaFunctions.Tags
      }
    };
    
    const fileName: string = lambdaFunctions.Configuration?.FunctionName ?? 'unknown-lambda';
    await writer.writeComponentFile(safeOutputDir, restructuredData, overWrite);
    
    const presignedUrl: string | undefined = lambdaFunctions.Code?.Location;
  
    if (!presignedUrl) {
      throw new Error("No presigned URL found. Cannot download the ZIP file.");
    }    
    
    const response: AxiosResponse = await axios({
      method: 'get',
      url: presignedUrl,
      responseType: 'arraybuffer'
    });
  
    await writer.extractAndCleanupZip(Buffer.from(response.data), safeOutputDir, fileName, overWrite ?? false);

    return fileName!;    
  } catch(error: any){
    if (error instanceof ResourceNotFoundException) {
      console.warn(`Lambda Function with FunctionName: ${funcArn} not found in these Instance. Please check you Instance Id.`);
    } else if (error instanceof Error && error.message.includes('Invalid parameter')) {
      console.warn(`Invalid Lambda Function with FunctionName: ${funcArn}. Please check the Name and ensure it's correctly formatted.`);
    } else if (error instanceof AccessDeniedException) {
      console.error(`Access denied: You don't have permission to access Lambda Function ${funcArn}.`);
    } else {
      console.error(`Unexpected error downloading Lambda Function ${funcArn}:`, error.message);
    }
    
    return null
  }
  
}

export async function downloadAllLambdaFunctions({
    connectClient,
    lambdaClient,
    instanceId,
    componentType, 
    outputDir,
    overWrite
  }:TDownloadComponentParams): Promise<string[]> {
    if (!connectClient) {
      throw new Error('ConnectClient is not provided');
    }
  
    const listResponse: ListLambdaFunctionsCommandOutput = await connectClient.send(new ListLambdaFunctionsCommand({ InstanceId: instanceId }));
  
    if (!listResponse.LambdaFunctions || listResponse.LambdaFunctions.length === 0) {
      console.warn('No Lambda functions found for this Connect instance.');
      return [];
    }
    
    
    const downloadPromises: Promise<string | null>[] = (listResponse.LambdaFunctions || [])
    .filter((arn): arn is string => typeof arn === 'string')
    .map(arn => arn.endsWith(":active") ? arn.slice(0, -7) : arn)
    .map(functionName => 
      downloadSpecificLambdaFunction({
        lambdaClient,
        instanceId,
        componentType,
        outputDir,
        overWrite,
        id: functionName,
      }).catch(() => null)
    );
      
  const downloadResults: (string | null)[] = await Promise.all(downloadPromises);

  // Filter out null results (failed downloads) and return successful downloads
  return downloadResults.filter((result): result is string => result !== null);
  }
  
  
  
  