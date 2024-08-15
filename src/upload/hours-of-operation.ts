import { HoursOfOperation } from '@aws-sdk/client-connect';

import { AwsComponentData, AwsComponentFileReader } from '../services/aws-component-file-reader.js';

interface IHoursOfOperation extends AwsComponentData {
   HoursOfOperation: HoursOfOperation;
}

export async function readQueueConfigurations(directoryPath: string): Promise<IHoursOfOperation[] | []> {
  const reader = new AwsComponentFileReader<IHoursOfOperation>();


  try {
    const hoursOfOperationConfigs = await reader.readComponentFiles(directoryPath, 'HoursOfOperation');

    if(!hoursOfOperationConfigs){
      return []
    }
    
    return []
 
  } catch (error) {
    console.error('Error reading Queue configurations:', error);
    throw error; // Re-throw the error to allow the caller to handle it
  }
}