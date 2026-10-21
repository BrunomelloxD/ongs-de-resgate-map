import { Injectable } from '@nestjs/common';
import { argon2id, hash, verify } from 'argon2';

@Injectable()
export class PasswordHasher {
  hash(plain: string): Promise<string> {
    return hash(plain, { type: argon2id });
  }

  verify(hashed: string, plain: string): Promise<boolean> {
    return verify(hashed, plain);
  }
}
