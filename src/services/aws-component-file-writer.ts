import AdmZip from 'adm-zip';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';


export interface WriteResult {
  fileName: string;
  filePath: string;
}

export class AwsComponentFileWriter<T> {
  async extractAndCleanupZip(zipBuffer: Buffer, outputDir: string, componentName: string, overwrite: boolean = false): Promise<string> {
    try {
      const componentDir = path.join(outputDir, componentName);
      await this.createDirectory(componentDir);

      const zipFilePath = path.join(componentDir, `${componentName}.zip`);
      await fs.writeFile(zipFilePath, zipBuffer);

      await this.extractZip(zipFilePath, componentDir, overwrite);
      await this.deleteFile(zipFilePath);

      return componentName;
    } catch (error) {
      console.error(`Error extracting and cleaning up zip for ${componentName}:`, error);
      throw error;
    }
  }
  
  async writeBinaryFile(folderPath: string, fileName: string, data: Buffer, overwrite: boolean = false): Promise<string> {
    try {
      await this.createDirectory(folderPath);
      const uniqueFileName = overwrite ? fileName : await this.findUniqueFileName(folderPath, path.parse(fileName).name, path.extname(fileName));
      const filePath = path.join(folderPath, uniqueFileName);
      
      await fs.writeFile(filePath, data);
      return uniqueFileName;
    } catch (error) {
      console.error(`Error writing binary file:`, error);
      throw error;
    }
  }

  async writeComponentFile(folderPath: string = '.', component: T, overwrite: boolean = false): Promise<WriteResult | undefined> {
    try {
      await this.createDirectory(folderPath);
      const fileName = await this.generateFileName(folderPath, component, overwrite);
      const filePath = path.join(folderPath, fileName);
      await this.writeFile(filePath, component, overwrite);
      
      return {filePath, fileName}
    } catch (error) {
      console.error(`Error writing component file:`, error);
      return undefined
    }
  }

  private async createDirectory(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  private async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error(`Error deleting file ${filePath}:`, error);
      throw error;
    }
  }

  private async extractZip(zipFilePath: string, outputDir: string, overwrite: boolean): Promise<void> {
    const zip = new AdmZip(zipFilePath);
    
    if (!overwrite) {
      // Check if files already exist concurrently
      const existenceChecks = zip.getEntries().map(zipEntry => {
        const entryPath = path.join(outputDir, zipEntry.entryName);
        return this.fileExists(entryPath);
      });
  
      const existenceResults = await Promise.all(existenceChecks);
  
      if (existenceResults.some(Boolean)) {
        console.warn(`Some files already exist in ${outputDir}. Skipping extraction.`);
        return;
      }
    }
  
    zip.extractAllTo(outputDir, overwrite);
  }
  
  
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private findName(obj: any): string {
    const nameProperties = ['Name', 'FunctionName'];
  
    for (const prop of nameProperties) {
      if (obj[prop] && typeof obj[prop] === 'string') {
        return obj[prop];
      }
    }
  
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        const nestedName = this.findName(obj[key]);
        if (nestedName !== 'unnamed') {
          return nestedName;
        }
      }
    }
  
    return 'unnamed';
  }

  private async findUniqueFileName(folderPath: string, baseName: string, extension: string = '.json', counter: number = 0): Promise<string> {
    const suffix = counter > 0 ? `_${counter}` : '';
    const fileName = `${baseName}${suffix}${extension}`;
    const filePath = path.join(folderPath, fileName);
  
    const fileExists = await this.fileExists(filePath);
  
    if (fileExists) {
      return this.findUniqueFileName(folderPath, baseName, extension, counter + 1);
    }
  
    return fileName;
  }
  
  private async generateFileName(folderPath: string, component: T, overwrite: boolean): Promise<string> {
    const baseName = this.findName(component);
    
    let fileName = `${baseName}.json`;
  
    if (!overwrite) {
      fileName = await this.findUniqueFileName(folderPath, baseName);
    }

    return fileName;
  }

  private async writeFile(filePath: string, data: T, overwrite: boolean): Promise<void> {
    if (!overwrite) {
      try {
        await fs.access(filePath);
        console.warn(`File ${filePath} already exists. Skipping.`);
        return;
      } catch {
      }
    }

    const jsonContent = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, jsonContent, 'utf8');
  }
}