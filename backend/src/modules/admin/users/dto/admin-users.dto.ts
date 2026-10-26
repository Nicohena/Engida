import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { AdminRole, UserRole } from '../../../../users/entities/user.entity';

const toBoolean = ({ value }: { value: unknown }): boolean | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return undefined;
};

export class QueryAdminUsersDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(AdminRole)
  adminRole?: AdminRole;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'name', 'email', 'isActive'])
  sort?: 'createdAt' | 'updatedAt' | 'name' | 'email' | 'isActive' = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export class UpdateUserStatusDto {
  @IsDefined()
  @Transform(toBoolean)
  @IsBoolean()
  isActive: boolean;

  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}

export class UpdateAdminRoleDto {
  @IsIn([...Object.values(AdminRole), null])
  adminRole: AdminRole | null;

  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}

export class CreateAdminUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'Password must contain at least one lower-case letter, one upper-case letter and one number',
  })
  password: string;

  @IsEnum(AdminRole)
  adminRole: AdminRole;
}
