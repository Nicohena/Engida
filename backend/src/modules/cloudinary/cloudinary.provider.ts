import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';

export const CLOUDINARY = 'CLOUDINARY';

export const CloudinaryProvider = {
  provide: CLOUDINARY,
  useFactory: (configService: ConfigService) => {
    return cloudinary.config({
      cloud_name:
        configService.get<string>('CLOUDINARY_CLOUD_NAME') ||
        configService.get<string>('cloudinary.cloudName') ||
        process.env.CLOUDINARY_CLOUD_NAME,
      api_key:
        configService.get<string>('CLOUDINARY_API_KEY') ||
        configService.get<string>('cloudinary.apiKey') ||
        process.env.CLOUDINARY_API_KEY,
      api_secret:
        configService.get<string>('CLOUDINARY_API_SECRET') ||
        configService.get<string>('cloudinary.apiSecret') ||
        process.env.CLOUDINARY_API_SECRET,
    });
  },
  inject: [ConfigService],
};
