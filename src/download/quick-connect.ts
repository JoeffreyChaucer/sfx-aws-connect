import type { ConnectClient } from "@aws-sdk/client-connect";

import { 
  DescribeQuickConnectCommand, 
  DescribeQuickConnectCommandOutput,  
  QuickConnect as IQuickConnect, 
  ListQuickConnectsCommand, 
  ListQuickConnectsCommandOutput, 
  ResourceNotFoundException
} from "@aws-sdk/client-connect";

export interface QuickConnect {
  QuickConnect: IQuickConnect;
}

export async function fetchSpecificQuickConnect(
  connectClient: ConnectClient,
  instanceId: string,
  quickConnectId?: string,
  name?: string
): Promise<QuickConnect | undefined> {
  let quickConnectIdToUse = quickConnectId;
  
  if (name && !quickConnectId) {
    quickConnectIdToUse = await getIdByName(connectClient, instanceId, name);
    if (!quickConnectIdToUse) {
      throw new ResourceNotFoundException({
        message: `Quick Connect with name "${name}" not found.`,
        $metadata: {}
      });
    }
  }
  
  const command: DescribeQuickConnectCommand = new DescribeQuickConnectCommand({
    InstanceId: instanceId,
    QuickConnectId: quickConnectIdToUse
  });
 
  const response: DescribeQuickConnectCommandOutput = await connectClient.send(command);

  if(!response.QuickConnect) return undefined;
  
  const quickConnect: IQuickConnect = response.QuickConnect;
  
  const quickConnectData: QuickConnect = {
    QuickConnect: {
      QuickConnectARN: quickConnect.QuickConnectARN,
      QuickConnectId: quickConnect.QuickConnectId,
      Name: quickConnect.Name,
      Description: quickConnect.Description,
      QuickConnectConfig: quickConnect.QuickConnectConfig,
      Tags: quickConnect.Tags,
      LastModifiedTime: quickConnect.LastModifiedTime,
      LastModifiedRegion: quickConnect.LastModifiedRegion
    }
  };
  
  return quickConnectData;
}

async function getIdByName(connectClient: ConnectClient, instanceId: string, name: string): Promise<string | undefined> {
    const command = new ListQuickConnectsCommand({ InstanceId: instanceId });
    const response: ListQuickConnectsCommandOutput = await connectClient.send(command);

    const quickConnectId = response.QuickConnectSummaryList?.find(quickConnect => quickConnect.Name === name);

    return quickConnectId?.Id;
}

export async function fetchAllQuickConnects( 
  connectClient: ConnectClient,
  instanceId: string,
): Promise<(QuickConnect | undefined)[]> {
  if (!connectClient) {
    throw new Error('ConnectClient is not provided');
  }

  const command: ListQuickConnectsCommand = new ListQuickConnectsCommand({ InstanceId: instanceId });
  const listResponse: ListQuickConnectsCommandOutput = await connectClient.send(command);

  if (!listResponse.QuickConnectSummaryList || listResponse.QuickConnectSummaryList.length === 0) {
    console.warn('No Quick Connects found for this Connect instance.');
    return [];
  }

  const quickConnects: Promise<QuickConnect | undefined>[] = listResponse.QuickConnectSummaryList
  .filter((QuickConnectSummary) => QuickConnectSummary.Id && QuickConnectSummary.Name)  // Filter out items without an ID and Names
  .map((QuickConnectSummary) =>
    fetchSpecificQuickConnect(
      connectClient,
      instanceId,
      QuickConnectSummary.Id!
    )
  );
  
  const quickConnectData: (QuickConnect | undefined)[] = await Promise.all(quickConnects);

  return quickConnectData;
}
