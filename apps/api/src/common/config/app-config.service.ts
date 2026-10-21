import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from './env.schema.js';

/** Typed env access. Use this instead of process.env. */
// Limits that apply when the demo quotas are off (AFORM-07, AFORM-08).
const MAX_IMAGES_PER_ANIMAL = 8;
const MAX_UPLOAD_MB = 10;

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  get<K extends keyof Env>(key: K): Env[K] {
    return this.config.get(key, { infer: true });
  }

  get isProduction(): boolean {
    return this.get('NODE_ENV') === 'production';
  }

  get s3() {
    return {
      endpoint: this.get('S3_ENDPOINT'),
      region: this.get('S3_REGION'),
      bucket: this.get('S3_BUCKET'),
      accessKeyId: this.get('S3_ACCESS_KEY_ID'),
      secretAccessKey: this.get('S3_SECRET_ACCESS_KEY'),
      forcePathStyle: this.get('S3_FORCE_PATH_STYLE'),
    };
  }

  get smtp() {
    return { url: this.get('SMTP_URL'), from: this.get('MAIL_FROM') };
  }

  get internalApiToken(): string {
    return this.get('INTERNAL_API_TOKEN');
  }

  get ipHashSecret(): string {
    return this.get('IP_HASH_SECRET');
  }

  get nominatim() {
    return {
      url: this.get('NOMINATIM_URL'),
      userAgent: this.get('NOMINATIM_USER_AGENT'),
    };
  }

  get webUrl(): string {
    return this.get('WEB_URL');
  }

  /** Effective limits: the DEMO_* values only apply while the demo is on. */
  get demo() {
    const enabled = this.get('DEMO_MODE');
    return {
      enabled,
      retentionDays: this.get('DEMO_RETENTION_DAYS'),
      maxNgos: this.get('DEMO_MAX_NGOS'),
      signupsPerIpPerDay: this.get('DEMO_SIGNUPS_PER_IP_PER_DAY'),
      maxAnimalsPerNgo: this.get('DEMO_MAX_ANIMALS_PER_NGO'),
      maxImagesPerAnimal: enabled
        ? this.get('DEMO_MAX_IMAGES_PER_ANIMAL')
        : MAX_IMAGES_PER_ANIMAL,
      maxUploadMb: enabled ? this.get('DEMO_MAX_UPLOAD_MB') : MAX_UPLOAD_MB,
      maxStorageMb: this.get('DEMO_MAX_STORAGE_MB'),
    };
  }
}
