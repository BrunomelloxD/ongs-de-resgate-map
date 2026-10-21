import { createHmac } from 'node:crypto';

/** HMAC-SHA256 of the visitor IP: the clear IP never reaches the database (DEMO-08). */
export function hashIp(ip: string, secret: string): string {
  return createHmac('sha256', secret).update(ip).digest('hex');
}
