import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateMe(userId: string, data: { name?: string; phone?: string }) {
    const name = data.name?.trim();
    const phone = data.phone?.trim();

    if (name !== undefined && name.length > 120) {
      throw new BadRequestException('Name is too long');
    }
    if (phone !== undefined && phone.length > 30) {
      throw new BadRequestException('Phone number is too long');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined ? { name: name || null } : {}),
        ...(phone !== undefined ? { phone: phone || null } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async listAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createAddress(userId: string, data: {
    fullName: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
    isDefault?: boolean;
  }) {
    this.validateAddress(data);

    return this.prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const hasExisting = await tx.address.count({ where: { userId } });

      return tx.address.create({
        data: {
          userId,
          fullName: data.fullName.trim(),
          phone: data.phone.trim(),
          line1: data.line1.trim(),
          line2: data.line2?.trim() || null,
          city: data.city.trim(),
          state: data.state.trim(),
          postalCode: data.postalCode.trim(),
          country: data.country?.trim() || 'IN',
          isDefault: data.isDefault ?? hasExisting === 0,
        },
      });
    });
  }

  async updateAddress(userId: string, id: string, data: Partial<{
    fullName: string;
    phone: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    isDefault: boolean;
  }>) {
    const existing = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Address not found');

    this.validateAddress({
      fullName: data.fullName ?? existing.fullName,
      phone: data.phone ?? existing.phone,
      line1: data.line1 ?? existing.line1,
      line2: data.line2 ?? existing.line2 ?? undefined,
      city: data.city ?? existing.city,
      state: data.state ?? existing.state,
      postalCode: data.postalCode ?? existing.postalCode,
      country: data.country ?? existing.country,
      isDefault: data.isDefault ?? existing.isDefault,
    });

    return this.prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }

      return tx.address.update({
        where: { id },
        data: {
          ...(data.fullName !== undefined ? { fullName: data.fullName.trim() } : {}),
          ...(data.phone !== undefined ? { phone: data.phone.trim() } : {}),
          ...(data.line1 !== undefined ? { line1: data.line1.trim() } : {}),
          ...(data.line2 !== undefined ? { line2: data.line2.trim() || null } : {}),
          ...(data.city !== undefined ? { city: data.city.trim() } : {}),
          ...(data.state !== undefined ? { state: data.state.trim() } : {}),
          ...(data.postalCode !== undefined ? { postalCode: data.postalCode.trim() } : {}),
          ...(data.country !== undefined ? { country: data.country.trim() } : {}),
          ...(data.isDefault !== undefined ? { isDefault: data.isDefault } : {}),
        },
      });
    });
  }

  async deleteAddress(userId: string, id: string) {
    const existing = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Address not found');

    await this.prisma.address.delete({ where: { id } });

    if (existing.isDefault) {
      const next = await this.prisma.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      if (next) {
        await this.prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    }

    return { message: 'Address deleted successfully' };
  }

  private validateAddress(data: {
    fullName: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
    isDefault?: boolean;
  }) {
    if (!data.fullName.trim() || !data.phone.trim() || !data.line1.trim() || !data.city.trim() || !data.state.trim() || !data.postalCode.trim()) {
      throw new BadRequestException('Required address fields are missing');
    }

    if (data.fullName.length > 120 || data.phone.length > 30 || data.line1.length > 200 || data.city.length > 100 || data.state.length > 100 || data.postalCode.length > 20 || (data.country?.length ?? 2) > 10) {
      throw new BadRequestException('Address field is too long');
    }
  }
}
