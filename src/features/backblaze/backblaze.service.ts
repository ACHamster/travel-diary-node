import { Injectable, HttpException, HttpStatus, forwardRef, Inject } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import { OssArchiveService } from '../oss-archive/oss-archive.service';

interface UploadUrlData {
  uploadUrl: string;
  authorizationToken: string;
}

export interface B2FileInfo {
  fileId?: string;
  fileName: string;
  contentSha1: string;
  contentLength?: number;
  contentType?: string;
  downloadUrl?: string;
  size?: string;
}

interface B2Bucket {
  bucketId: string;
  bucketName: string;
  [key: string]: unknown;
}

interface B2AuthResponse {
  apiInfo: {
    storageApi: {
      absoluteMinimumPartSize: number;
      apiUrl: string;
      downloadUrl: string;
      recommendedPartSize: number;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  authorizationToken: string;
}

interface B2PartData {
  partNumber: number;
  contentSha1: string;
}

@Injectable()
export class BackblazeService {
  private authToken = '';
  private apiUrl = '';
  private downloadUrl = '';
  private bucketId = '';
  private readonly bucketName: string;
  private readonly applicationKeyId: string;
  private readonly applicationKey: string;
  private readonly accountId: string;

  constructor(
    @Inject(forwardRef(() => OssArchiveService))
    private readonly OssArchiveService: OssArchiveService,
  ) {
    const keyId = process.env.B2_APPLICATION_KEY_ID;
    const key = process.env.B2_APPLICATION_KEY;
    const bucket = process.env.B2_BUCKET_NAME;
    const account  = process.env.B2_ACCOUNT_ID;

    if (!keyId || !key || !bucket || !account) {
      throw new Error('B2 环境变量未正确配置');
    }

    this.applicationKeyId = keyId;
    this.applicationKey = key;
    this.bucketName = bucket;
    this.accountId = account;
  }

  async initialize(): Promise<void> {
    try {
      await this.authorize();
      await this.getBucketId();
    } catch (error) {
      console.error('Failed to initialize B2:', error);
      throw new HttpException('B2初始化失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async authorize(): Promise<void> {
    try {
      const authString = Buffer.from(`${this.applicationKeyId}:${this.applicationKey}`).toString('base64');

      const response = await axios.get<B2AuthResponse>(
        'https://api004.backblazeb2.com/b2api/v3/b2_authorize_account',
        {
          headers: {
            'Authorization': `Basic ${authString}`
          }
        }
      );

      this.authToken = response.data.authorizationToken;
      this.apiUrl = response.data.apiInfo.storageApi.apiUrl;
      this.downloadUrl = response.data.apiInfo.storageApi.downloadUrl;

    } catch (error) {
      const errorMessage = error instanceof Error ?
        (axios.isAxiosError(error) && error.response?.data ? String(error.response.data) : error.message) :
        '未知错误';
      console.error('B2 认证失败:', errorMessage);
      throw new HttpException('B2认证失败', HttpStatus.UNAUTHORIZED);
    }
  }

  private async getBucketId(): Promise<void> {
    try{
      interface BucketResponse {
        buckets: B2Bucket[];
      }

      const response = await axios.post<BucketResponse>(
        `${this.apiUrl}/b2api/v3/b2_list_buckets`,
        {
          accountId: this.accountId
        },
        {
          headers: {
            'Authorization': this.authToken
          }
        }
      );
      if(response.data.buckets.length !== 0) {
        this.bucketId = response.data.buckets[0].bucketId;
      }

    } catch (error) {
        const errorMessage = error instanceof Error ?
          (axios.isAxiosError(error) && error.response?.data ? String(error.response.data) : error.message) :
          '未知错误';
        console.error('获取存储桶ID失败:', errorMessage);
        throw new HttpException('获取存储桶ID失败', HttpStatus.INTERNAL_SERVER_ERROR);
      }
  }

  private async getUploadUrl(): Promise<UploadUrlData> {
    try {
      const response = await axios.post<UploadUrlData>(
        `${this.apiUrl}/b2api/v2/b2_get_upload_url`,
        {
          bucketId: this.bucketId
        },
        {
          headers: {
            'Authorization': this.authToken
          }
        }
      );

      return {
        uploadUrl: response.data.uploadUrl,
        authorizationToken: response.data.authorizationToken
      };
    } catch (error) {
      const errorMessage = error instanceof Error ?
        (axios.isAxiosError(error) && error.response?.data ? String(error.response.data) : error.message) :
        '未知错误';
      console.error('获取上传URL失败:', errorMessage);
      throw new HttpException('获取上传URL失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async uploadFile(fileName: string, fileBuffer: Buffer, contentType: string): Promise<{
    fileName: any;
    contentSha1: any;
    cdnUrl: string;
    downloadUrl?: string;
    contentLength?: any;
    contentType?: any;
    fileId?: any
  }> {
    try {
      if (!this.authToken) {
        await this.initialize();
      }

      // 计算文件SHA1校验和
      const sha1 = crypto.createHash('sha1').update(fileBuffer).digest('hex');

      const fileExist = await this.OssArchiveService.isFileExist(sha1);
      if (fileExist != null) {
        console.log("fileExist");
        return {
          fileName: fileExist.file_name,
          contentSha1: fileExist.sha1,
          cdnUrl: fileExist.file_path,
        }
      }


      // 获取上传URL
      const uploadUrlData = await this.getUploadUrl();

      // 上传文件
      const response = await axios.post<B2FileInfo>(
        uploadUrlData.uploadUrl,
        fileBuffer,
        {
          headers: {
            'Authorization': uploadUrlData.authorizationToken,
            'X-Bz-File-Name': encodeURIComponent(fileName),
            'Content-Type': contentType,
            'X-Bz-Content-Sha1': sha1,
            'Content-Length': fileBuffer.length
          }
        }
      );

      const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
      };

      // 保存文件信息到数据库
      await this.OssArchiveService.creteFileArchive(
        {
          file_name: response.data.fileName,
          sha1: response.data.contentSha1,
          file_path: `https://img.achamster.live/${encodeURIComponent(fileName)}`,
          size: formatFileSize(response.data.contentLength ?? 0),
        }
      )

      // 返回文件信息和下载URL
      return {
        fileId: response.data.fileId,
        fileName: response.data.fileName,
        contentSha1: response.data.contentSha1,
        contentLength: response.data.contentLength,
        contentType: response.data.contentType,
        downloadUrl: `${this.downloadUrl}/file/${this.bucketName}/${encodeURIComponent(fileName)}`,
        cdnUrl: `https://img.achamster.live/${encodeURIComponent(fileName)}`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ?
        (axios.isAxiosError(error) && error.response?.data ? String(error.response.data) : error.message) :
        '未知错误';
      console.error('文件上传失败:', errorMessage);
      throw new HttpException('文件上传失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async downloadFile(fileName: string): Promise<Buffer> {
    try {
      if (!this.authToken) {
        await this.initialize();
      }

      console.log(`${this.downloadUrl}/file/${this.bucketName}/${encodeURIComponent(fileName)}`);
      const response = await axios.get<ArrayBuffer>(
        `${this.downloadUrl}/file/${this.bucketName}/${encodeURIComponent(fileName)}`,
        {
          headers: {
            'Authorization': this.authToken,
          },
          responseType: 'arraybuffer'
        }
      );

      return Buffer.from(response.data);
    } catch (error) {
      const errorMessage = error instanceof Error ?
        (axios.isAxiosError(error) && error.response?.data ? String(error.response.data) : error.message) :
        '未知错误';
      console.error('文件下载失败:', errorMessage);
      throw new HttpException('文件下载失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async listFiles(prefix?: string, maxFileCount = 100): Promise<unknown[]> {
    try {
      if (!this.authToken) {
        await this.initialize();
      }

      interface B2ListFilesResponse {
        files: unknown[];
      }

      const response = await axios.post<B2ListFilesResponse>(
        `${this.apiUrl}/b2api/v2/b2_list_file_names`,
        {
          bucketId: this.bucketId,
          prefix: prefix || '',
          maxFileCount: maxFileCount
        },
        {
          headers: {
            'Authorization': this.authToken
          }
        }
      );

      return response.data.files;
    } catch (error) {
      const errorMessage = error instanceof Error ?
        (axios.isAxiosError(error) && error.response?.data ? String(error.response.data) : error.message) :
        '未知错误';
      console.error('列出文件失败:', errorMessage);
      throw new HttpException('列出文件失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteFile(fileName: string, fileId?: string): Promise<void> {
    try {
      if (!this.authToken) {
        await this.initialize();
      }

      // 如果没有提供fileId，先获取它
      if (!fileId) {
        const files = await this.listFiles(fileName, 1) as Array<{fileId: string}>;
        if (files.length === 0) {
          throw new Error(`文件 ${fileName} 未找到`);
        }
        fileId = files[0].fileId;
      }


      // 删除文件
      await axios.post(
        `${this.apiUrl}/b2api/v2/b2_delete_file_version`,
        {
          fileName: fileName,
          fileId: fileId
        },
        {
          headers: {
            'Authorization': this.authToken
          }
        }
      );
    } catch (error) {
      let errorMessage = '未知错误';

      if (axios.isAxiosError(error)) {
        if (error.response?.data) {
          // B2 API 通常会返回一个包含 code 和 message 的错误对象
          if (typeof error.response.data === 'object') {
            errorMessage = JSON.stringify(error.response.data);
          } else {
            errorMessage = String(error.response.data);
          }
        } else if (error.message) {
          errorMessage = error.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      console.error('文件删除失败:', errorMessage);
      throw new HttpException(`文件删除失败: ${errorMessage}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // 大文件上传 - 分片上传实现
  async uploadLargeFile(fileName: string, fileBuffer: Buffer, contentType: string): Promise<B2FileInfo> {
    try {
      if (!this.authToken) {
        await this.initialize();
      }

      interface StartLargeFileResponse {
        fileId: string;
      }

      interface UploadPartUrlResponse {
        uploadUrl: string;
        authorizationToken: string;
      }

      interface UploadPartResponse {
        contentSha1: string;
      }

      interface FinishLargeFileResponse {
        fileId: string;
        fileName: string;
        contentLength: number;
        contentType: string;
      }

      // 1. 开始大文件上传
      const startResponse = await axios.post<StartLargeFileResponse>(
        `${this.apiUrl}/b2api/v2/b2_start_large_file`,
        {
          bucketId: this.bucketId,
          fileName: fileName,
          contentType: contentType
        },
        {
          headers: {
            'Authorization': this.authToken
          }
        }
      );

      const fileId = startResponse.data.fileId;

      // 2. 获取分片上传URL
      const getUploadPartUrl = async (): Promise<UploadPartUrlResponse> => {
        const response = await axios.post<UploadPartUrlResponse>(
          `${this.apiUrl}/b2api/v2/b2_get_upload_part_url`,
          {
            fileId: fileId
          },
          {
            headers: {
              'Authorization': this.authToken
            }
          }
        );
        return response.data;
      };

      // 3. 将文件分成多个片段
      const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB 每片
      const totalChunks = Math.ceil(fileBuffer.length / CHUNK_SIZE);
      const partSha1Array: B2PartData[] = [];

      for (let partNumber = 1; partNumber <= totalChunks; partNumber++) {
        const start = (partNumber - 1) * CHUNK_SIZE;
        const end = Math.min(partNumber * CHUNK_SIZE, fileBuffer.length);
        const chunk = fileBuffer.slice(start, end);

        // 计算片段的SHA1
        const sha1 = crypto.createHash('sha1').update(chunk).digest('hex');

        // 获取上传URL
        const uploadPartUrlData = await getUploadPartUrl();

        // 上传片段
        const uploadResponse = await axios.post<UploadPartResponse>(
          uploadPartUrlData.uploadUrl,
          chunk,
          {
            headers: {
              'Authorization': uploadPartUrlData.authorizationToken,
              'X-Bz-Part-Number': partNumber.toString(),
              'X-Bz-Content-Sha1': sha1,
              'Content-Length': chunk.length
            }
          }
        );

        partSha1Array.push({
          partNumber: partNumber,
          contentSha1: uploadResponse.data.contentSha1
        });
      }

      // 4. 完成大文件上传
      const finishResponse = await axios.post<FinishLargeFileResponse>(
        `${this.apiUrl}/b2api/v2/b2_finish_large_file`,
        {
          fileId: fileId,
          partSha1Array: partSha1Array.map(part => part.contentSha1)
        },
        {
          headers: {
            'Authorization': this.authToken
          }
        }
      );

      // 返回文件信息和下载URL
      return {
        fileId: finishResponse.data.fileId,
        fileName: finishResponse.data.fileName,
        contentLength: finishResponse.data.contentLength,
        contentType: finishResponse.data.contentType,
        contentSha1: '', // API 可能没有返回这个值
        downloadUrl: `${this.downloadUrl}/file/${this.bucketName}/${encodeURIComponent(fileName)}`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ?
        (axios.isAxiosError(error) && error.response?.data ? String(error.response.data) : error.message) :
        '未知错误';
      console.error('大文件上传失败:', errorMessage);
      throw new HttpException('大文件上传失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
