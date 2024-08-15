import { ConnectClient } from "@aws-sdk/client-connect";

import { RoutingProfile, fetchAllRoutingProfiles, fetchSpecificRoutingProfile } from '../download/routing-profiles.js';

export class RoutingProfileDownloader {
  async downloadComponent(
    connectClient: ConnectClient,
    instanceId: string,
    id?: string,
    name?: string
  ): Promise<RoutingProfile | RoutingProfile[] | undefined> {
    if (id || name) {
      return fetchSpecificRoutingProfile(connectClient, instanceId, id, name);
    }
 
    const allRoutingProfiles = await fetchAllRoutingProfiles(connectClient, instanceId);

    return allRoutingProfiles.filter((item): item is RoutingProfile => item !== undefined);
  }
}
