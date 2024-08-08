import { DescribeRoutingProfileCommand, ListRoutingProfilesCommand, RoutingProfile } from "@aws-sdk/client-connect";
import * as path from 'node:path';

import { FileService } from '../services/file-service.js';
import { TDownloadComponentParams } from '../types/index.js';

type RoutingProfileResponse = {
  RoutingProfile?: RoutingProfile,
};

export async function downloadSingleRoutingProfile({
  connectClient,
  instanceId,
  id,
  outputDir,
  overrideFile
}: TDownloadComponentParams): Promise<string> {
  if (!connectClient) {
    throw new Error('ConnectClient is not provided');
  }

  const describeCommand = new DescribeRoutingProfileCommand({
    InstanceId: instanceId,
    RoutingProfileId: id
  });
  const describeResponse = await connectClient.send(describeCommand);

  if (describeResponse.RoutingProfile) {
    const restructuredData: RoutingProfileResponse = {
      RoutingProfile: {
        Name: describeResponse.RoutingProfile.Name,
        RoutingProfileArn: describeResponse.RoutingProfile.RoutingProfileArn,
        RoutingProfileId: describeResponse.RoutingProfile.RoutingProfileId,
        Description: describeResponse.RoutingProfile.Description,
        MediaConcurrencies: describeResponse.RoutingProfile.MediaConcurrencies,
        DefaultOutboundQueueId: describeResponse.RoutingProfile.DefaultOutboundQueueId,
        Tags: describeResponse.RoutingProfile.Tags,
      }
    };
    
    FileService.createDirectory(outputDir);
    const fileName = `${restructuredData.RoutingProfile?.Name ?? 'Unknown_RoutingProfile'}`;
    const filePath = FileService.getFileName(outputDir, fileName, '.json', overrideFile);
    FileService.writeJsonToFile(filePath, restructuredData, overrideFile);
    return path.basename(filePath);
  }
 
  throw new Error(`Routing Profile with ID ${id} not found.`);
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

  const listCommand = new ListRoutingProfilesCommand({ InstanceId: instanceId });
  const listResponse = await connectClient.send(listCommand);

  if (!listResponse.RoutingProfileSummaryList || listResponse.RoutingProfileSummaryList.length === 0) {
    return [];
  }

  FileService.createDirectory(outputDir);

  const downloadPromises = listResponse.RoutingProfileSummaryList
    .filter(summary => summary.Id)
    .map(async summary => {
      const downloadConfig: TDownloadComponentParams = {
        connectClient,
        instanceId,
        outputDir,
        overrideFile,
        id: summary.Id,
      };

      try {
        return await downloadSingleRoutingProfile(downloadConfig);
      } catch {
        return null;
      } // Return null for failed downloads
    });

  const downloadResults = await Promise.all(downloadPromises);

  // Filter out null results (failed downloads) and return successful downloads
  const downloadedFiles = downloadResults.filter((result): result is string => result !== null);

  return downloadedFiles;
}