import { env } from "../env";
import { SessionsStorageService } from "../interfaces/SessionStorageService";
import AWS from "aws-sdk";
import { fixFileName } from "../utils/fix-filename";

export class CloudflareBucketStorage implements SessionsStorageService {
  private s3: AWS.S3;
  private BUCKET_NAME = env.BUCKET_NAME;

  constructor() {
    this.s3 = new AWS.S3({
      endpoint: env.ENDPOINT,
      credentials: {
        accessKeyId: env.ACCESS_KEY_ID,
        secretAccessKey: env.SECRET_KEY_ID,
      },
      region: "auto",
    });
  }
  async create(key: string, data: any) {
    await this.s3
      .putObject({
        Bucket: this.BUCKET_NAME,
        Key: this.getFileKey(key),
        Body: data,
        ContentType: "application/json",
      })
      .promise();
  }
  async get(key: string) {
    const response = await this.s3
      .getObject({
        Bucket: this.BUCKET_NAME,
        Key: this.getFileKey(key),
      })
      .promise();
    return response.Body?.toString("utf-8") || null;
  }

  async remove(key: string) {
    await this.s3
      .deleteObject({
        Bucket: this.BUCKET_NAME,
        Key: this.getFileKey(key),
      })
      .promise();
  }

  async exists(file: string) {
    await this.s3
      .headObject({
        Bucket: this.BUCKET_NAME,
        Key: this.getFileKey(file),
      })
      .promise();
    return true;
  }

  getFileKey(key: string) {
    return `${env.SESSION_NAME}/${fixFileName(key)}.json`;
  }
}
