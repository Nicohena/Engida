import 'reflect-metadata';
import { validate } from './env.validation';

describe('environment validation', () => {
  const requiredEnvironment = {
    PORT: '3000',
    DATABASE_URL: 'postgresql://localhost/engida',
    AI_SERVICE_URL: 'http://localhost:8000',
  };

  it('rejects a missing JWT access secret', () => {
    expect(() => validate(requiredEnvironment)).toThrow();
  });

  it('rejects a JWT access secret shorter than 32 characters', () => {
    expect(() =>
      validate({ ...requiredEnvironment, JWT_ACCESS_SECRET: 'short-secret' }),
    ).toThrow();
  });

  it('accepts a sufficiently long JWT access secret and preserves other configuration', () => {
    const config = {
      ...requiredEnvironment,
      JWT_ACCESS_SECRET: 'a-secure-access-secret-with-32-characters-minimum',
      CLOUDINARY_CLOUD_NAME: 'configured-cloud',
    };

    expect(validate(config)).toMatchObject({
      ...config,
      PORT: 3000,
    });
  });
});
