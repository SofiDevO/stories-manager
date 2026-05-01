export interface IStorageService {
  generateUploadUrl(fileName: string): Promise<string>;
}
