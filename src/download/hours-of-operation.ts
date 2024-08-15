import type { ConnectClient } from "@aws-sdk/client-connect";

import { 
  DescribeHoursOfOperationCommand, 
  DescribeHoursOfOperationCommandOutput,  
  HoursOfOperation as IHoursOfOperation,
  ListHoursOfOperationsCommand, 
  ListHoursOfOperationsCommandOutput, 
  ResourceNotFoundException 
} from "@aws-sdk/client-connect";

export interface HoursOfOperation {
  HoursOfOperation: IHoursOfOperation;
}

export async function fetchSpecificHoursOfOperation(
  connectClient: ConnectClient,
  instanceId: string,
  hoursOfOperationId?: string,
  name?: string
): Promise<HoursOfOperation | undefined> {
  let hoursOfOperationIdToUse = hoursOfOperationId;
  
  if (name && !hoursOfOperationId) {
    hoursOfOperationIdToUse = await getIdByName(connectClient, instanceId, name);
    if (!hoursOfOperationIdToUse) {
      throw new ResourceNotFoundException({
        message: `Hours of Operation with name "${name}" not found.`,
        $metadata: {}
      });
    }
  }
  
  const command: DescribeHoursOfOperationCommand = new DescribeHoursOfOperationCommand({
    InstanceId: instanceId,
    HoursOfOperationId: hoursOfOperationIdToUse
  });
 
  const response: DescribeHoursOfOperationCommandOutput = await connectClient.send(command);
  if(!response.HoursOfOperation) return undefined;
  
  const hoursOfOperation: IHoursOfOperation = response.HoursOfOperation;
  
  const hoursOfOperationData: HoursOfOperation = {
    HoursOfOperation: {
      HoursOfOperationId: hoursOfOperation.HoursOfOperationId,
      HoursOfOperationArn: hoursOfOperation.HoursOfOperationArn,
      Name: hoursOfOperation.Name,
      Description: hoursOfOperation.Description,
      TimeZone: hoursOfOperation.TimeZone,
      Config: hoursOfOperation.Config,
      Tags: hoursOfOperation.Tags,
      LastModifiedTime: hoursOfOperation.LastModifiedTime,
      LastModifiedRegion: hoursOfOperation.LastModifiedRegion
    }
  };
  
  return hoursOfOperationData;
}

async function getIdByName(connectClient: ConnectClient, instanceId: string, name: string): Promise<string | undefined> {
    const command = new ListHoursOfOperationsCommand({ InstanceId: instanceId });
    const response: ListHoursOfOperationsCommandOutput = await connectClient.send(command);

    const hoursOfOperationId = response.HoursOfOperationSummaryList?.find(hours => hours.Name === name);

    return hoursOfOperationId?.Id;
}

export async function fetchAllHoursOfOperation( 
  connectClient: ConnectClient,
  instanceId: string,
): Promise<(HoursOfOperation | undefined)[]> {
  
  const command: ListHoursOfOperationsCommand = new ListHoursOfOperationsCommand({ InstanceId: instanceId })
  const listResponse: ListHoursOfOperationsCommandOutput = await connectClient.send(command);

  if (!listResponse.HoursOfOperationSummaryList || listResponse.HoursOfOperationSummaryList.length === 0) {
    console.warn('No Hours of Operation found for this Connect instance.');
    return [];
  }

  const hoursOfOperation: Promise<HoursOfOperation | undefined>[] = listResponse.HoursOfOperationSummaryList
  .filter((HoursOfOperationSummary) => HoursOfOperationSummary.Id && HoursOfOperationSummary.Name)  // Filter out items without an ID and Names
  .map((HoursOfOperationSummary) =>
    fetchSpecificHoursOfOperation(
      connectClient,
      instanceId,
      HoursOfOperationSummary.Id!
    )
  );
  
  const hoursOfOperationData: (HoursOfOperation | undefined)[] = await Promise.all(hoursOfOperation)

  return hoursOfOperationData
}