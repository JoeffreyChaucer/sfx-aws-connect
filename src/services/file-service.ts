import * as fs from 'node:fs';
import * as path from 'node:path';

export interface IFileService {
  createDirectory(dirPath: string): void;
  getFileName(basePath: string, fileName: string, extension: string, override: boolean): string;
  writeJsonToFile(filePath: string, data: unknown, override: boolean): void;
}

export class FileService implements IFileService {
  static createDirectory(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  static getFileName(basePath: string, fileName: string, extension?: string, overrideFile?: boolean): string {
    // Remove the extension from fileName if it's already there
    const nameWithoutExtension = path.parse(fileName).name;
    
    // If extension is not provided, use the original file's extension
    const fileExtension = extension || path.extname(fileName);
  
    let fullPath = path.join(basePath, `${nameWithoutExtension}${fileExtension}`);
    
    if (!overrideFile) {
      let counter = 1;
      while (fs.existsSync(fullPath)) {
        fullPath = path.join(basePath, `${nameWithoutExtension}_${counter}${fileExtension}`);
        counter++;
      }
    }
  
    return fullPath;
  }

  static writeJsonToFile(filePath: string, data: unknown, overrideFile?: boolean): void {
    const dirPath = path.dirname(filePath);
    this.createDirectory(dirPath);
    
    if (!overrideFile && fs.existsSync(filePath)) {
      throw new Error(`File already exists: ${filePath}. Use overrideFile option to overwrite.`);
    }
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  createDirectory(dirPath: string): void {
    FileService.createDirectory(dirPath);
  }

  getFileName(basePath: string, fileName: string, extension: string, override: boolean): string {
    return FileService.getFileName(basePath, fileName, extension, override);
  }

  writeJsonToFile(filePath: string, data: unknown, override: boolean): void {
    FileService.writeJsonToFile(filePath, data, override);
  }
}