import * as fs from 'node:fs';
import * as path from 'node:path';

export class AwsComponentFileReader<T> {
  async readComponentFiles(folderPath: string, componentType: string, recursive: boolean = true): Promise<T[]> {
    try {
      const jsonFiles = await this.findJsonFiles(folderPath, recursive);
      const componentDataPromises = jsonFiles.map(async (filePath) => {
        const fileContent = await this.readFile(filePath);
        try {
          const parsedData = JSON.parse(fileContent);
          return parsedData
        } catch (parseError) {
          console.error(`Error parsing JSON in file ${filePath}:`, parseError);
          return null;
        }
      });

      const componentDataArray = await Promise.all(componentDataPromises);
      
      
      const filteredDataArray = componentDataArray.filter(data => data && data[componentType] !== undefined);
      
      if(filteredDataArray.length === 0){
        throw new Error(`No ${componentType} json config file found`)
      }

      return filteredDataArray as T[];
    } catch (error: any) {
      console.error(`Error reading directory ${folderPath}:`, error.message);
      return [];
    }
  }
  


  private async findJsonFiles(dirPath: string, recursive: boolean): Promise<string[]> {
    const items = await this.readDirectory(dirPath);
    const itemPromises = items.map(async (item) => {
      const itemPath = path.join(dirPath, item);
      const stats = await this.getFileStats(itemPath);
      
      if (stats.isDirectory() && recursive) {
        return this.findJsonFiles(itemPath, recursive);
      }

      if (stats.isFile() && path.extname(item).toLowerCase() === '.json') {
        return [itemPath];
      }

      return [];
    });

    const nestedResults = await Promise.all(itemPromises);
    const jsonFiles = nestedResults.flat();
    
    if (jsonFiles.length === 0) {
      throw new Error(`No JSON files found in directory ${dirPath}`);
    }
  
    return jsonFiles;
  }

  private async getFileStats(filePath: string): Promise<fs.Stats> {
    return new Promise((resolve, reject) => {
      fs.stat(filePath, (err, stats) => {
        if (err) reject(err);
        else resolve(stats);
      });
    });
  }

  private async readDirectory(dirPath: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      fs.readdir(dirPath, (err, files) => {
        if (err) reject(err);
        else resolve(files);
      });
    });
  }
  
  private async readFile(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }
  
}