import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SettingCategory,
  SettingType,
  SystemSetting,
} from './entities/system-setting.entity';
import { User } from '../../../users/entities/user.entity';
import { AuditService } from '../../audit/audit.service';

export interface FormattedSetting {
  id: string;
  key: string;
  value: any;
  rawValue: string;
  category: SettingCategory;
  type: SettingType;
  description: string | null;
  isPublic: boolean;
  updatedAt: Date;
  updatedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
}

@Injectable()
export class AdminSettingsService {
  constructor(
    @InjectRepository(SystemSetting)
    private readonly settingRepository: Repository<SystemSetting>,
    private readonly auditService: AuditService,
  ) {}

  private parseValue(value: string, type: SettingType): any {
    switch (type) {
      case SettingType.BOOLEAN:
        return value.toLowerCase() === 'true';
      case SettingType.NUMBER: {
        const num = Number(value);
        return isNaN(num) ? 0 : num;
      }
      case SettingType.JSON:
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      case SettingType.STRING:
      default:
        return value;
    }
  }

  private serializeValue(value: any, type: SettingType): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (type === SettingType.JSON) {
      return typeof value === 'string' ? value : JSON.stringify(value);
    }
    return String(value);
  }

  async getAllSettings(category?: SettingCategory): Promise<{
    settings: FormattedSetting[];
    grouped: Record<SettingCategory, FormattedSetting[]>;
  }> {
    const qb = this.settingRepository
      .createQueryBuilder('setting')
      .leftJoinAndSelect('setting.updatedBy', 'user')
      .orderBy('setting.category', 'ASC')
      .addOrderBy('setting.key', 'ASC');

    if (category) {
      qb.where('setting.category = :category', { category });
    }

    const rows = await qb.getMany();

    const formatted: FormattedSetting[] = rows.map((s) => ({
      id: s.id,
      key: s.key,
      value: this.parseValue(s.value, s.type),
      rawValue: s.value,
      category: s.category,
      type: s.type,
      description: s.description,
      isPublic: s.isPublic,
      updatedAt: s.updatedAt,
      updatedBy: s.updatedBy
        ? {
            id: s.updatedBy.id,
            name: s.updatedBy.name,
            email: s.updatedBy.email,
          }
        : null,
    }));

    const grouped: Record<SettingCategory, FormattedSetting[]> = {
      [SettingCategory.GENERAL]: [],
      [SettingCategory.BOOKINGS]: [],
      [SettingCategory.FINANCE]: [],
      [SettingCategory.LOCALIZATION]: [],
      [SettingCategory.NOTIFICATIONS]: [],
      [SettingCategory.SECURITY]: [],
    };

    for (const item of formatted) {
      if (grouped[item.category]) {
        grouped[item.category].push(item);
      }
    }

    return { settings: formatted, grouped };
  }

  async getPublicSettings(): Promise<Record<string, any>> {
    const rows = await this.settingRepository.find({
      where: { isPublic: true },
    });

    const result: Record<string, any> = {};
    for (const r of rows) {
      result[r.key] = this.parseValue(r.value, r.type);
    }
    return result;
  }

  async updateSettings(
    updates: Record<string, any>,
    actor: User,
  ): Promise<{ success: boolean; updatedCount: number }> {
    if (!updates || Object.keys(updates).length === 0) {
      throw new BadRequestException('No setting updates provided');
    }

    const keys = Object.keys(updates);
    const existing = await this.settingRepository.find();
    const existingMap = new Map(existing.map((s) => [s.key, s]));

    const changedDiff: Record<string, { before: any; after: any }> = {};
    const toSave: SystemSetting[] = [];

    for (const key of keys) {
      const target = existingMap.get(key);
      if (!target) {
        throw new NotFoundException(`Setting key "${key}" not found`);
      }

      const newVal = updates[key];
      const serialized = this.serializeValue(newVal, target.type);

      // Simple validation bounds
      if (target.type === SettingType.NUMBER) {
        const num = Number(serialized);
        if (isNaN(num)) {
          throw new BadRequestException(`Value for "${key}" must be a valid number`);
        }
        if (key.includes('percent') && (num < 0 || num > 100)) {
          throw new BadRequestException(`Percentage setting "${key}" must be between 0 and 100`);
        }
      }

      if (target.value !== serialized) {
        changedDiff[key] = {
          before: this.parseValue(target.value, target.type),
          after: this.parseValue(serialized, target.type),
        };
        target.value = serialized;
        target.updatedById = actor.id;
        toSave.push(target);
      }
    }

    if (toSave.length > 0) {
      await this.settingRepository.save(toSave);

      await this.auditService.record({
        actor,
        action: 'settings.update',
        entityType: 'system_settings',
        entityId: 'platform_config',
        metadata: {
          updatedKeys: Object.keys(changedDiff),
          diff: changedDiff,
        },
      });
    }

    return { success: true, updatedCount: toSave.length };
  }
}
