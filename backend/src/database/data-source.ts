import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { User } from '../users/entities/user.entity';
import { HostProfile } from '../users/entities/host-profile.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { Property } from '../modules/properties/entities/property.entity';
import { Room } from '../modules/properties/entities/room.entity';
import { AvailabilityBlock } from '../modules/properties/entities/availability-block.entity';
import { Amenity } from '../modules/amenities/entities/amenity.entity';
import { Booking } from '../modules/bookings/entities/booking.entity';
import { Review } from '../modules/reviews/entities/review.entity';

const databaseUrl = process.env.DATABASE_URL;

export const AppDataSource = new DataSource(
  databaseUrl
    ? {
        type: 'postgres',
        url: databaseUrl,
        entities: [
          User,
          HostProfile,
          RefreshToken,
          Property,
          Room,
          AvailabilityBlock,
          Amenity,
          Booking,
          Review,
        ],
        migrations: [path.join(__dirname, 'migrations/*{.ts,.js}')],
        synchronize: false,
        logging: process.env.DEBUG_SQL === 'true',
      }
    : {
        type: 'postgres',
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432', 10),
        username: process.env.DATABASE_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD || 'postgres',
        database: process.env.DATABASE_NAME || 'engida_db',
        entities: [
          User,
          HostProfile,
          RefreshToken,
          Property,
          Room,
          AvailabilityBlock,
          Amenity,
          Booking,
          Review,
        ],
        migrations: [path.join(__dirname, 'migrations/*{.ts,.js}')],
        synchronize: false,
        logging: process.env.DEBUG_SQL === 'true',
      },
);

export default AppDataSource;
