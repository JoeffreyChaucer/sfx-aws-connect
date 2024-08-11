import { AccessDeniedException, DescribeRoutingProfileCommand, DescribeRoutingProfileCommandOutput, ListRoutingProfilesCommand, ListRoutingProfilesCommandOutput, ResourceNotFoundException, RoutingProfile } from "@aws-sdk/client-connect";

import { FileService } from '../services/file-service.js';
import { TDownloadComponentParams } from '../types/index.js';

type TRoutingProfile = {
  RoutingProfile?: RoutingProfile,
};

export async function downloadSpecificRoutingProfile({
  connectClient,
  instanceId,
  id: routingProfileId,
  outputDir,
  overrideFile
}: TDownloadComponentParams): Promise<string | null> {
  if (!connectClient) {
    throw new Error('ConnectClient is not provided');
  }
 
  try {
    const describeResponse: DescribeRoutingProfileCommandOutput = await connectClient.send(new DescribeRoutingProfileCommand({
      InstanceId: instanceId,
      RoutingProfileId: routingProfileId
    }));
    
    const routingProfile: RoutingProfile | undefined = describeResponse.RoutingProfile;
    if (!routingProfile) return null;
    
    
    const restructuredData: TRoutingProfile = {
      RoutingProfile: {
        Name: routingProfile.Name,
        RoutingProfileArn: routingProfile.RoutingProfileArn,
        RoutingProfileId: routingProfile.RoutingProfileId,
        Description: routingProfile.Description,
        MediaConcurrencies: routingProfile.MediaConcurrencies,
        DefaultOutboundQueueId: routingProfile.DefaultOutboundQueueId,
        Tags: routingProfile.Tags,
      }
    };
    
    const fileName: string | undefined = routingProfile.Name;
    const filePath = FileService.getFileName(outputDir, fileName, '.json', overrideFile);
    FileService.writeJsonToFile(filePath, restructuredData, overrideFile);
    
    return fileName ?? null;
    
  } catch (error) {
    if (error instanceof ResourceNotFoundException) {
      console.warn(`Routing Profile with ID ${routingProfileId} not found. It may have been deleted.`);
    } else if (error instanceof Error && error.message.includes('Invalid parameter')) {
      console.warn(`Invalid Routing Profile ID: ${routingProfileId}. Please check the ID and ensure it's correctly formatted.`);
    } else if (error instanceof AccessDeniedException) {
      console.error(`Access denied: You don't have permission to access Routing Profile ${routingProfileId}.`);
    } else {
      console.error(`Unexpected error downloading Routing Profile ${routingProfileId}:`, error);
    }

    return null;
 
  }
}

export async function downloadAllRoutingProfiles({
  connectClient,
  instanceId, 
  outputDir,
  overrideFile
}: TDownloadComponentParams): Promise<string[]> {
  if (!connectClient) {
    throw new Error('ConnectClient is not provided');
  }

  const listResponse: ListRoutingProfilesCommandOutput = await connectClient.send(new ListRoutingProfilesCommand({ InstanceId: instanceId }));

  if (!listResponse.RoutingProfileSummaryList || listResponse.RoutingProfileSummaryList.length === 0) {
    console.warn('No Routing Profiles found for this Connect instance.');
    return [];
  }

  const downloadPromises: Promise<string | null>[] = listResponse.RoutingProfileSummaryList
    .filter(summary => summary.Id)
    .map(summary => 
      downloadSpecificRoutingProfile({
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