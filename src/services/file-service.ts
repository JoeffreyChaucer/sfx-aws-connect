import AdmZip from 'adm-zip';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface IFileService {
  createDirectory(dirPath: string): void;
  extractZipAndCleanup(zipFilePath: string, extractPath: string): void;
  getFileName(basePath: string, fileName: string, extension: string, override: boolean): string;
  writeBinaryToFile(filePath: string, data: Buffer | ArrayBuffer, override: boolean): string;
  writeJsonToFile(filePath: string, data: unknown, override: boolean): void;
}

export class FileService implements IFileService {
  static createDirectory(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  static extractZipAndCleanup(zipFilePath: string, extractPath: string): void {
    try {
      const zip = new AdmZip(zipFilePath);
      zip.extractAllTo(extractPath, true);

      // Delete the zip file after extraction
      fs.unlinkSync(zipFilePath);

      console.log(`Extracted and deleted zip file: ${zipFilePath}`);
    } catch (error) {
      console.error(`Error extracting or deleting zip file ${zipFilePath}:`, error);
      throw error;
    }
  }

  static getFileName(basePath?: string, fileName?: string, extension?: string, overrideFile: boolean = false): string {
    const safeBasePath: string = basePath ?? '.';
    const safeFileName: string = fileName ?? 'unnamed';
    const safeExtension: string = extension ?? '';
    
    const parsedPath = path.parse(safeFileName);
    const nameWithoutExtension = parsedPath.name || 'unnamed';
    
    // If extension is not provided, use the original file's extension
    const fileExtension = safeExtension || parsedPath.ext || '';
  
    let fullPath = path.join(safeBasePath, `${nameWithoutExtension}${fileExtension}`);
    
    if (!overrideFile) {
      let counter = 1;
      while (fs.existsSync(fullPath)) {
        fullPath = path.join(safeBasePath, `${nameWithoutExtension}_${counter}${fileExtension}`);
        counter++;
      }
    }
  
    return fullPath;
  }

  static writeBinaryToFile(filePath: string, data: Buffer | ArrayBuffer, overrideFile: boolean = false): string {
    const dirPath: string = path.dirname(filePath);
    this.createDirectory(dirPath);
    
    const finalPath = this.getFileName(path.dirname(filePath), path.basename(filePath), '', overrideFile);
    
    fs.writeFileSync(finalPath, Buffer.from(data));
    
    return path.basename(finalPath);
  }
  
  static writeJsonToFile(filePath: string, data: unknown, overrideFile: boolean = false): void {
    const dirPath: string = path.dirname(filePath);
    this.createDirectory(dirPath);
    
    if (overrideFile && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  createDirectory(dirPath: string): void {
    FileService.createDirectory(dirPath);
  }

  extractZipAndCleanup(zipFilePath: string, extractPath: string): void {
    FileService.extractZipAndCleanup(zipFilePath, extractPath);
  }

  getFileName(basePath: string, fileName: string, extension: string, override: boolean): string {
    return FileService.getFileName(basePath, fileName, extension, override);
  }
  
  writeBinaryToFile(filePath: string, data: Buffer | ArrayBuffer, override: boolean): string {
    return FileService.writeBinaryToFile(filePath, data, override);
  }
  
  writeJsonToFile(filePath: string, data: unknown, override: boolean): void {
    FileService.writeJsonToFile(filePath, data, override);
  }
}