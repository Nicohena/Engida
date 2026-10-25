import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { Readable } from 'stream';

export interface CloudinaryUploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'image/avif',
  ];

  /**
   * Validate uploaded file format and size
   */
  private validateFile(file: Express.Multer.File, maxSizeBytes = 10 * 1024 * 1024) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file provided or file buffer is empty');
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type "${file.mimetype}". Allowed types: JPEG, PNG, WEBP, GIF, SVG, AVIF.`,
      );
    }

    if (file.size > maxSizeBytes) {
      throw new BadRequestException(
        `File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds max allowed limit of ${maxSizeBytes / (1024 * 1024)}MB`,
      );
    }
  }

  /**
   * Check if Cloudinary credentials are set
   */
  private verifyConfiguration() {
    const config = cloudinary.config();
    const isPlaceholder = (val?: string) =>
      !val ||
      val === 'your_cloudinary_cloud_name' ||
      val === 'your_cloudinary_api_key' ||
      val === 'your_cloudinary_api_secret' ||
      val.startsWith('your_');

    if (
      isPlaceholder(config.cloud_name) ||
      isPlaceholder(config.api_key) ||
      isPlaceholder(config.api_secret)
    ) {
      throw new BadRequestException(
        'Cloudinary service is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your backend/.env file. You can still enter direct image URLs.',
      );
    }
  }

  /**
   * Upload a single image file buffer to Cloudinary
   */
  async uploadImage(
    file: Express.Multer.File,
    folder = 'engida',
  ): Promise<CloudinaryUploadResult> {
    this.validateFile(file);
    this.verifyConfiguration();

    return new Promise<CloudinaryUploadResult>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            this.logger.error(`Cloudinary upload failed: ${error.message}`, error);
            return reject(new InternalServerErrorException(`Image upload failed: ${error.message}`));
          }
          if (!result) {
            return reject(new InternalServerErrorException('Image upload failed: No result returned from Cloudinary'));
          }

          resolve({
            publicId: result.public_id,
            url: result.url,
            secureUrl: result.secure_url,
            format: result.format,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
          });
        },
      );

      const stream = Readable.from(file.buffer);
      stream.pipe(uploadStream);
    });
  }

  /**
   * Upload multiple image files to Cloudinary in parallel
   */
  async uploadImages(
    files: Express.Multer.File[],
    folder = 'engida',
  ): Promise<CloudinaryUploadResult[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No image files provided for upload');
    }

    return Promise.all(files.map((file) => this.uploadImage(file, folder)));
  }

  /**
   * Delete an image from Cloudinary by its public ID
   */
  async deleteImage(publicId: string): Promise<any> {
    this.verifyConfiguration();
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      this.logger.log(`Deleted Cloudinary asset: ${publicId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete Cloudinary asset ${publicId}: ${error.message}`);
      throw new InternalServerErrorException(`Failed to delete asset: ${error.message}`);
    }
  }

  /**
   * Helper method to extract publicId from a Cloudinary URL
   */
  extractPublicId(url: string): string | null {
    try {
      if (!url || !url.includes('cloudinary.com')) return null;
      const parts = url.split('/upload/');
      if (parts.length < 2) return null;
      const pathAfterUpload = parts[1];
      // Remove version prefix (e.g. v1726055555/)
      const withoutVersion = pathAfterUpload.replace(/^v\d+\//, '');
      // Strip extension
      const lastDotIndex = withoutVersion.lastIndexOf('.');
      return lastDotIndex !== -1 ? withoutVersion.substring(0, lastDotIndex) : withoutVersion;
    } catch {
      return null;
    }
  }

  /** Delete only assets owned by this property's dedicated upload folder. */
  async deletePropertyImages(propertyId: string, imageUrls: string[]): Promise<void> {
    const ownedFolder = `engida/properties/${propertyId}/`;
    const publicIds = [...new Set(imageUrls
      .map((url) => this.extractPublicId(url))
      .filter((publicId): publicId is string => Boolean(publicId?.startsWith(ownedFolder))))];

    await Promise.all(publicIds.map(async (publicId) => {
      try {
        await this.deleteImage(publicId);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown Cloudinary deletion error';
        this.logger.warn(`Could not delete detached property image ${publicId}: ${message}`);
      }
    }));
  }
}
