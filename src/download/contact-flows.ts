import type { ConnectClient, DescribeContactFlowCommandOutput, ListContactFlowsCommandOutput } from "@aws-sdk/client-connect";

import {
  DescribeContactFlowCommand,
  ContactFlow as IContactFlow,
  ListContactFlowsCommand,
  ResourceNotFoundException
} from "@aws-sdk/client-connect";
import pLimit from 'p-limit';

export interface ContactFlow {
  ContactFlow: IContactFlow;
}

const limit = pLimit(1);

export async function fetchSpecificContactFlow(
  connectClient: ConnectClient,
  instanceId: string,
  contactFlowId?: string,
  name?: string
): Promise<ContactFlow | undefined> {
  let contactFlowIdToUse = contactFlowId;
  
  if (name && !contactFlowId) {
    contactFlowIdToUse = await getIdByName(connectClient, instanceId, name);
    if (!contactFlowIdToUse) {
      throw new ResourceNotFoundException({
        message: `Contact Flow with name "${name}" not found.`,
        $metadata: {}
      });
    }
  }
  
  const command: DescribeContactFlowCommand = new DescribeContactFlowCommand({
    InstanceId: instanceId,
    ContactFlowId: contactFlowIdToUse
  });
 
  const response: DescribeContactFlowCommandOutput = await connectClient.send(command);
  
  if(!response.ContactFlow) return undefined
  
  const contactFlow: IContactFlow = response.ContactFlow
  
  const contactFlowData: ContactFlow = {
    ContactFlow: {
      Arn: contactFlow.Arn,
      Id: contactFlow.Id,
      Name: contactFlow.Name,
      Type: contactFlow.Type,
      State: contactFlow.State,
      Status: contactFlow.Status,
      Description: contactFlow.Description,
      Content: contactFlow.Content,
      Tags: contactFlow.Tags,
    }
  };

  return contactFlowData;
}

async function getIdByName(connectClient: ConnectClient, instanceId: string, name: string): Promise<string | undefined> {
    const command = new ListContactFlowsCommand({ InstanceId: instanceId });
    const response: ListContactFlowsCommandOutput = await connectClient.send(command);

    const contactFlowId = response.ContactFlowSummaryList?.find(flow => flow.Name === name);

    return contactFlowId?.Id;
}

export async function fetchAllContactFlows( 
  connectClient: ConnectClient,
  instanceId: string,
): Promise<(ContactFlow | undefined)[]> {
  
  const command: ListContactFlowsCommand = new ListContactFlowsCommand({ InstanceId: instanceId })
  const listResponse: ListContactFlowsCommandOutput = await connectClient.send(command);

  if (!listResponse.ContactFlowSummaryList || listResponse.ContactFlowSummaryList.length === 0) {
    console.warn('No Contact Flows found for this Connect instance.');
    return [];
  }

  const contactFlows: Promise<ContactFlow | undefined>[] = listResponse.ContactFlowSummaryList
  .filter((ContactFlowSummary) => ContactFlowSummary.Id && ContactFlowSummary.Name) // Filter out items without an ID and Names
  .map((ContactFlowSummary) =>
    limit(() =>
      fetchSpecificContactFlow(
        connectClient,
        instanceId,
        ContactFlowSummary.Id!
      )
    )
  );

  
  const contactFlowData: (ContactFlow | undefined)[] = await Promise.all(contactFlows)
  
  
  const validContactFlowData: ContactFlow[] = contactFlowData.filter((flow): flow is ContactFlow => flow !== undefined);


  return validContactFlowData
}
