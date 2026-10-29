import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  AdminSettingsService,
  FormattedSetting,
} from './admin-settings.service';
import {
  SettingCategory,
  SettingType,
  SystemSetting,
} from './entities/system-setting.entity';
import { AuditService } from '../../audit/audit.service';
import { User, UserRole } from '../../../users/entities/user.entity';

describe('AdminSettingsService', () => {
  let service: AdminSettingsService;
  let settingRepo: any;
  let auditService: any;

  const mockAdmin: User = {
    id: 'admin-uuid',
    email: 'admin@engida.com',
    name: 'Admin Tester',
    role: UserRole.ADMIN,
  } as User;

  const mockSettings: SystemSetting[] = [
    {
      id: 'set-1',
      key: 'maintenance.enabled',
      value: 'false',
      category: SettingCategory.GENERAL,
      type: SettingType.BOOLEAN,
      description: 'Maintenance toggle',
      isPublic: true,
      updatedById: null,
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'set-2',
      key: 'finance.platform_service_fee_percent',
      value: '12',
      category: SettingCategory.FINANCE,
      type: SettingType.NUMBER,
      description: 'Platform fee percentage',
      isPublic: false,
      updatedById: null,
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(async () => {
    settingRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockSettings),
      }),
      find: jest.fn().mockResolvedValue(mockSettings),
      save: jest.fn().mockImplementation((val) => Promise.resolve(val)),
    };

    auditService = {
      record: jest.fn().mockResolvedValue({ id: 'audit-log-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminSettingsService,
        {
          provide: getRepositoryToken(SystemSetting),
          useValue: settingRepo,
        },
        {
          provide: AuditService,
          useValue: auditService,
        },
      ],
    }).compile();

    service = module.get<AdminSettingsService>(AdminSettingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllSettings', () => {
    it('returns settings and properly groups them by category', async () => {
      const res = await service.getAllSettings();
      expect(res.settings).toHaveLength(2);
      expect(res.grouped[SettingCategory.GENERAL]).toHaveLength(1);
      expect(res.grouped[SettingCategory.FINANCE]).toHaveLength(1);
      expect(res.settings[0].value).toBe(false);
      expect(res.settings[1].value).toBe(12);
    });
  });

  describe('getPublicSettings', () => {
    it('returns only public key-value map', async () => {
      settingRepo.find.mockResolvedValueOnce([mockSettings[0]]);
      const res = await service.getPublicSettings();
      expect(res['maintenance.enabled']).toBe(false);
    });
  });

  describe('updateSettings', () => {
    it('throws BadRequestException when no updates provided', async () => {
      await expect(service.updateSettings({}, mockAdmin)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFoundException when an unknown key is updated', async () => {
      await expect(
        service.updateSettings({ 'unknown.key': 'val' }, mockAdmin),
      ).rejects.toThrow(NotFoundException);
    });

    it('validates percentage limits between 0 and 100', async () => {
      await expect(
        service.updateSettings(
          { 'finance.platform_service_fee_percent': 150 },
          mockAdmin,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates settings and writes an audit log', async () => {
      const res = await service.updateSettings(
        { 'finance.platform_service_fee_percent': 15 },
        mockAdmin,
      );

      expect(res.success).toBe(true);
      expect(res.updatedCount).toBe(1);
      expect(settingRepo.save).toHaveBeenCalled();
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'settings.update',
          entityType: 'system_settings',
        }),
      );
    });
  });
});
