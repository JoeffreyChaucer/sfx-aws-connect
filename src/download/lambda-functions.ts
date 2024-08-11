import { AccessDeniedException, ListLambdaFunctionsCommand, ListLambdaFunctionsCommandOutput, ResourceNotFoundException } from "@aws-sdk/client-connect";
import { GetFunctionCommand, GetFunctionCommandOutput } from "@aws-sdk/client-lambda";
import axios, { AxiosResponse } from "axios";

import { FileService } from "../services/file-service.js";
import { TDownloadComponentParams, TLambdaFunction } from '../types/index.js';

  

type TLambda = {
  LambdaFunction?: TLambdaFunction
}

export async function downloadSpecificLambdaFunction({
  lambdaClient,
  id: funcArn,
  outputDir,
  overrideFile,
}: TDownloadComponentParams): Promise<string | null> {
  if (!lambdaClient) {
    throw new Error('LambdaClient is not provided');
  }

  try {
    const lambdaFunctions: GetFunctionCommandOutput = await lambdaClient.send(new GetFunctionCommand({ FunctionName: funcArn }));
  
    if (!lambdaFunctions) return null
    
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
    const safeOutputDir: string = outputDir ?? './lambda-functions';
    
    const jsonFilePath: string = FileService.getFileName(safeOutputDir, fileName, '.json', overrideFile);
    FileService.writeJsonToFile(jsonFilePath, restructuredData, overrideFile)
    
    const presignedUrl: string | undefined = lambdaFunctions.Code?.Location;
  
    if (!presignedUrl) {
      return null;
    }
    
    const response: AxiosResponse = await axios({
      method: 'get',
      url: presignedUrl,
      responseType: 'arraybuffer'
    });
  
    const zipFilePath: string = FileService.getFileName(safeOutputDir, fileName, '.zip', overrideFile);
    const savedFileName = FileService.writeBinaryToFile(zipFilePath, response.data, overrideFile);

    const zipExtractFilePath: string = FileService.getFileName(safeOutputDir, fileName, '', overrideFile);
    FileService.createDirectory(zipExtractFilePath);
    
    FileService.extractZipAndCleanup(zipFilePath, zipExtractFilePath);
    
    return savedFileName;    
  } catch(error){
    if (error instanceof ResourceNotFoundException) {
      console.warn(`Lambda Function with FunctionName: ${funcArn} not found in these Instance. Please check you Instance Id.`);
    } else if (error instanceof Error && error.message.includes('Invalid parameter')) {
      console.warn(`Invalid Lambda Function with FunctionName: ${funcArn}. Please check the Name and ensure it's correctly formatted.`);
    } else if (error instanceof AccessDeniedException) {
      console.error(`Access denied: You don't have permission to access Lambda Function ${funcArn}.`);
    } else {
      console.error(`Unexpected error downloading Lambda Function ${funcArn}:`, error);
    }
    
    return null
  }
  
}



  export async function downloadAllLambdaFunctions({
    connectClient,
    instanceId, 
    outputDir,
    overrideFile
  }:TDownloadComponentParams): Promise<string[]> {
    if (!connectClient) {
      throw new Error('ConnectClient is not provided');
    }
  
    const listResponse: ListLambdaFunctionsCommandOutput = await connectClient.send(new ListLambdaFunctionsCommand({ InstanceId: instanceId }));
  
    if (!listResponse.LambdaFunctions || listResponse.LambdaFunctions.length === 0) {
      console.warn('No Lambda functions found for this Connect instance.');
      return [];
    }
    
    
    const functionNames: (string | undefined)[] = listResponse.LambdaFunctions
    .filter((arn): arn is string => typeof arn === 'string')
    .map(arn => {
      const parts: string[] = arn.split(':');
      const lastPart: string | undefined = parts.at(-1);
      
      return lastPart ? lastPart.split(':')[0] : undefined; 
    });
    
    const downloadPromises: Promise<string | null>[] = functionNames.map(functionName => 
      downloadSpecificLambdaFunction({
        connectClient,
        instanceId,
        outputDir,
        overrideFile,
        id: functionName,
      }).catch(() => null)
    );
      
  const downloadResults: (string | null)[] = await Promise.all(downloadPromises);

  // Filter out null results (failed downloads) and return successful downloads
  return downloadResults.filter((result): result is string => result !== null);
  }