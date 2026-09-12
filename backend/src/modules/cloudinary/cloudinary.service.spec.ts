import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { v2 as cloudinary } from 'cloudinary';

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn(),
      destroy: jest.fn(),
    },
  },
}));

describe('CloudinaryService', () => {
  let service: CloudinaryService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [CloudinaryService],
    }).compile();

    service = module.get<CloudinaryService>(CloudinaryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('extractPublicId', () => {
    it('should extract publicId correctly from a Cloudinary URL', () => {
      const url = 'https://res.cloudinary.com/demo/image/upload/v1612345678/engida/properties/prop-1/cover.jpg';
      const result = service.extractPublicId(url);
      expect(result).toBe('engida/properties/prop-1/cover');
    });

    it('should extract publicId when no version tag is present', () => {
      const url = 'https://res.cloudinary.com/demo/image/upload/engida/sample.png';
      const result = service.extractPublicId(url);
      expect(result).toBe('engida/sample');
    });

    it('should return null for non-cloudinary URL', () => {
      expect(service.extractPublicId('https://example.com/image.jpg')).toBeNull();
      expect(service.extractPublicId('')).toBeNull();
    });
  });

  describe('uploadImage validations', () => {
    it('should throw BadRequestException if no file is provided', async () => {
      await expect(service.uploadImage(null as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if file has unsupported mime type', async () => {
      const invalidFile = {
        buffer: Buffer.from('pdf data'),
        mimetype: 'application/pdf',
        size: 100,
      } as Express.Multer.File;

      await expect(service.uploadImage(invalidFile)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if file exceeds size limit', async () => {
      const largeFile = {
        buffer: Buffer.from('large'),
        mimetype: 'image/jpeg',
        size: 15 * 1024 * 1024, // 15MB
      } as Express.Multer.File;

      await expect(service.uploadImage(largeFile)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if Cloudinary is not configured', async () => {
      (cloudinary.config as jest.Mock).mockReturnValue({
        cloud_name: '',
        api_key: '',
        api_secret: '',
      });

      const validFile = {
        buffer: Buffer.from('fake image data'),
        mimetype: 'image/jpeg',
        size: 1000,
      } as Express.Multer.File;

      await expect(service.uploadImage(validFile)).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteImage', () => {
    it('should call cloudinary destroy when configured', async () => {
      (cloudinary.config as jest.Mock).mockReturnValue({
        cloud_name: 'test_cloud',
        api_key: 'test_key',
        api_secret: 'test_secret',
      });
      (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({ result: 'ok' });

      const result = await service.deleteImage('engida/test_image');
      expect(result).toEqual({ result: 'ok' });
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('engida/test_image');
    });
  });
});
