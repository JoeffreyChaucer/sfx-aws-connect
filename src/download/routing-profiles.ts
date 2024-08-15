import type { ConnectClient } from "@aws-sdk/client-connect";

import { 
  DescribeRoutingProfileCommand, 
  DescribeRoutingProfileCommandOutput,  
  RoutingProfile as IRoutingProfile, 
  ListRoutingProfilesCommand, 
  ListRoutingProfilesCommandOutput, 
  ResourceNotFoundException
} from "@aws-sdk/client-connect";

export interface RoutingProfile {
  RoutingProfile: IRoutingProfile;
}

export async function fetchSpecificRoutingProfile(
  connectClient: ConnectClient,
  instanceId: string,
  routingProfileId?: string,
  name?: string
): Promise<RoutingProfile | undefined> {
  let routingProfileIdToUse = routingProfileId;
  
  if (name && !routingProfileId) {
    routingProfileIdToUse = await getIdByName(connectClient, instanceId, name);
    if (!routingProfileIdToUse) {
      throw new ResourceNotFoundException({
        message: `Routing Profile with name "${name}" not found.`,
        $metadata: {}
      });
    }
  }
  
  const command: DescribeRoutingProfileCommand = new DescribeRoutingProfileCommand({
    InstanceId: instanceId,
    RoutingProfileId: routingProfileIdToUse
  });
 
  const response: DescribeRoutingProfileCommandOutput = await connectClient.send(command);

  if(!response.RoutingProfile) return undefined
  
  const routingProfile: IRoutingProfile = response.RoutingProfile
  
  const routingProfileData: RoutingProfile = {
    RoutingProfile: {
      InstanceId: routingProfile.InstanceId,
      Name: routingProfile.Name,
      RoutingProfileArn: routingProfile.RoutingProfileArn,
      RoutingProfileId: routingProfile.RoutingProfileId,
      Description: routingProfile.Description,
      MediaConcurrencies: routingProfile.MediaConcurrencies,
      DefaultOutboundQueueId: routingProfile.DefaultOutboundQueueId,
      Tags: routingProfile.Tags,
      NumberOfAssociatedQueues: routingProfile.NumberOfAssociatedQueues,
      NumberOfAssociatedUsers: routingProfile.NumberOfAssociatedUsers,
      AgentAvailabilityTimer: routingProfile.AgentAvailabilityTimer,
      LastModifiedTime: routingProfile.LastModifiedTime,
      LastModifiedRegion: routingProfile.LastModifiedRegion,
      IsDefault: routingProfile.IsDefault
    }
  };
  
  return routingProfileData;
}

async function getIdByName(connectClient: ConnectClient, instanceId: string, name: string): Promise<string | undefined> {
    const command = new ListRoutingProfilesCommand({ InstanceId: instanceId });
    const response: ListRoutingProfilesCommandOutput = await connectClient.send(command);

    const routingProfileId = response.RoutingProfileSummaryList?.find(profile => profile.Name === name);

    return routingProfileId?.Id;
}

export async function fetchAllRoutingProfiles( 
  connectClient: ConnectClient,
  instanceId: string,
): Promise<(RoutingProfile | undefined)[]> {
  if (!connectClient) {
    throw new Error('ConnectClient is not provided');
  }

  const command: ListRoutingProfilesCommand = new ListRoutingProfilesCommand({ InstanceId: instanceId })
  const listResponse: ListRoutingProfilesCommandOutput = await connectClient.send(command);

  if (!listResponse.RoutingProfileSummaryList || listResponse.RoutingProfileSummaryList.length === 0) {
    console.warn('No Routing Profiles found for this Connect instance.');
    return [];
  }

  const routingProfiles: Promise<RoutingProfile | undefined>[] = listResponse.RoutingProfileSummaryList
  .filter((RoutingProfileSummary) => RoutingProfileSummary.Id && RoutingProfileSummary.Name)  // Filter out items without an ID and Names
  .map((RoutingProfileSummary) =>
    fetchSpecificRoutingProfile(
      connectClient,
      instanceId,
      RoutingProfileSummary.Id!
    )
  );
  
  const routingProfileData: (RoutingProfile | undefined)[] = await Promise.all(routingProfiles)

  return routingProfileData
}