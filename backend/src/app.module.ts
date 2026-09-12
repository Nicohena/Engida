import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { User } from './users/entities/user.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';
import { AiModule } from './modules/ai/ai.module';
import { PropertiesModule } from './modules/properties/properties.module';
import { AmenitiesModule } from './modules/amenities/amenities.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { CloudinaryModule } from './modules/cloudinary/cloudinary.module';
import { Property } from './modules/properties/entities/property.entity';
import { Room } from './modules/properties/entities/room.entity';
import { Amenity } from './modules/amenities/entities/amenity.entity';
import { Booking } from './modules/bookings/entities/booking.entity';
import { Review } from './modules/reviews/entities/review.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST', 'localhost'),
        port: configService.get<number>('DATABASE_PORT', 5432),
        username: configService.get<string>('DATABASE_USER', 'postgres'),
        password: configService.get<string>('DATABASE_PASSWORD', 'postgres'),
        database: configService.get<string>('DATABASE_NAME', 'engida_db'),
        entities: [User, RefreshToken, Property, Room, Amenity, Booking, Review],
        synchronize: configService.get<boolean>('DATABASE_SYNCHRONIZE', true),
        logging:
          configService.get<string>('DEBUG_SQL') === 'true'
            ? true
            : ['error', 'warn'],
      }),
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => [
        {
          ttl: 60000, // 1 minute
          limit: 10,  // max 10 requests per minute per IP for sensitive routes
        },
      ],
    }),
    HealthModule,
    DatabaseModule,
    AiModule,
    UsersModule,
    AuthModule,
    PropertiesModule,
    AmenitiesModule,
    BookingsModule,
    ReviewsModule,
    CloudinaryModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
