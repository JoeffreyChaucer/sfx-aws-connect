import { AccessDeniedException, InvalidParameterException, ResourceNotFoundException } from "@aws-sdk/client-connect";

export function handleAwsError(error: any, componentType: string, identifier: string | undefined): string {
  
  if (error instanceof ResourceNotFoundException) {
    return `${error.message} Please check if the ${componentType} exists.`;
  }
  
  if (error instanceof InvalidParameterException) {
    return `${componentType} with id "${identifier}" not found. Please check if the ${componentType} exists.`;
  }

  if (error instanceof AccessDeniedException) {
    return `Access denied: You don't have permission to access ${componentType} "${identifier}".`;
  }

  if (error.name === 'UnrecognizedClientException') {
    return 'Authentication Error: Please check your AWS credentials and region.';
  }
  
  if (error.name === 'TimeoutError') {
    return `Timeout Error: The request to AWS timed out. This could be due to network latency or high server load. Please try again later.`;
  }

  if (error.code === 'ECONNRESET' || (error.message && error.message.includes('ECONNRESET'))) {
    return `Network Error (ECONNRESET): The connection was reset by the remote host. This often occurs due to network issues or server-side problems. Please try the operation again.`;
  }
  

  return `An unexpected error occurred: ${error.name} - ${error.message}`;
}