import { AgentStatusDownloader } from './agent-status-downloader.js';
import { ContactFlowDownloader } from './contact-flows-downloader.js';
import { HoursOfOperationDownloader } from './hours-of-operation-downloader.js';
import { QueueDownloader } from './queues-downloader.js';
import { RoutingProfileDownloader } from './routing-profiles-downloader.js';
// Import other downloader classes as they are implemented
// import { PromptDownloader } from './prompt-downloader.js';
// import { ContactFlowDownloader } from './contact-flow-downloader.js';
// ... and so on


// Define a base interface for all downloaders
interface Downloader {
  downloadComponent: (connectClient: any, instanceId: string, id?: string, name?: string) => Promise<any>;
}

export const DownloaderFactory = {
  getDownloader(componentType: string): Downloader {
    switch (componentType.toLowerCase()) {
      case 'hoursofoperation': {
        return new HoursOfOperationDownloader();
      }

      case 'queue': {
        return new QueueDownloader()
      }

      case 'all': {
        // TODO: Implement AllDownloader
        throw new Error('All component type downloader not yet implemented');
      }

      case 'prompt': {
        // TODO: Implement PromptDownloader
        // return new PromptDownloader();
        throw new Error('Prompt downloader not yet implemented');
      }

      case 'contactflow': {
        return new ContactFlowDownloader();
      }

      case 'routingprofile': {
        return new RoutingProfileDownloader();
      }

      case 'agentstatus': {
        return new AgentStatusDownloader();
      }

      case 'quickconnect': {
        // TODO: Implement QuickConnectDownloader
        // return new QuickConnectDownloader();
        throw new Error('QuickConnect downloader not yet implemented');
      }

      case 'lambdafunctions': {
        // TODO: Implement LambdaFunctionsDownloader
        // return new LambdaFunctionsDownloader();
        throw new Error('LambdaFunctions downloader not yet implemented');
      }

      default: {
        throw new Error(`Unsupported component type: ${componentType}`);
      }
    }
  },
};