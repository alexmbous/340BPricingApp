import type { Role } from '@apexcare/shared-types';
import { ConflictException, Injectable } from '@nestjs/common';


import { PrismaService } from '../../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';

export interface CreateUserInput {
  email: string;
  password: string;
  role: Role;
  parentOrganizationId: string | null;
  organizationId: string | null;
  adminProfile?: { firstName: string; lastName: string; title?: string };
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly password: PasswordService,
  ) {}

  async createUser(input: CreateUserInput): Promise<{ id: string; email: string; role: Role }> {
    const email = input.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException({ message: 'Email already registered', code: 'USER_EXISTS' });
    }
    const passwordHash = await this.password.hash(input.password);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        role: input.role,
        parentOrganizationId: input.parentOrganizationId,
        organizationId: input.organizationId,
        adminProfile: input.adminProfile
          ? { create: input.adminProfile }
          : undefined,
      },
    });
    return { id: user.id, email: user.email, role: user.role };
  }
}
