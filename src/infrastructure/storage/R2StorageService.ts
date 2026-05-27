import {S3Client, PutObjectCommand} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';
import type { IStorageService } from '../../domain/repositories/IStorageService';

export class R2StorageService implements IStorageService{
    private s3Client:S3Client;
    private bucketName:string;


    constructor(accountId:string, accessKeyId:string, secretAccessKey:string, bucketName:string ){
        this.bucketName = bucketName;
        this.s3Client = new S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials:{
                accessKeyId,
                secretAccessKey,
            }
        })
    }

    async generateUploadUrl(fileName: string): Promise<string> {
        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: fileName,
            ContentType: 'video/mp4',
        });

        const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
        return signedUrl;
    }
}