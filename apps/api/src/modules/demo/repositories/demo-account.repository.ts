import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service.js';
import {
  type DemoAccountNgo,
  IDemoAccountRepository,
  type Point,
} from './demo-account.repository.interface.js';

@Injectable()
export class DemoAccountRepository extends IDemoAccountRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  findByEmail(email: string): Promise<DemoAccountNgo | null> {
    return this.prisma.ngo.findUnique({
      where: { email },
      select: { id: true, lat: true, lng: true, city: true, uf: true },
    });
  }

  findActivePoints(city: string, uf: string): Promise<Point[]> {
    return this.prisma.ngo.findMany({
      where: { city, uf, status: 'ACTIVE' },
      select: { lat: true, lng: true },
    });
  }

  async deleteAnimals(ngoId: string): Promise<number> {
    const [, { count }] = await this.prisma.$transaction([
      // Pending uploads too: their objects went with the images prefix.
      this.prisma.animalImage.deleteMany({ where: { ngoId } }),
      this.prisma.animal.deleteMany({ where: { ngoId } }),
    ]);
    return count;
  }
}
