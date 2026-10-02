import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { HostProfile } from './entities/host-profile.entity';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, HostProfile])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
