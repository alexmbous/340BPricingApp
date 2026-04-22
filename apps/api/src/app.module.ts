import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ClsModule } from 'nestjs-cls';

import { AuditModule } from './modules/audit/audit.module';
import { AuditInterceptor } from './modules/audit/audit.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { HealthModule } from './modules/health/health.module';
import { LocationsModule } from './modules/locations/locations.module';
import { MedicationsModule } from './modules/medications/medications.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ParentOrganizationsModule } from './modules/parent-organizations/parent-organizations.module';
import { PatientsModule } from './modules/patients/patients.module';
import { PharmaciesModule } from './modules/pharmacies/pharmacies.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { UsersModule } from './modules/users/users.module';
import { AppConfigModule } from './config/app-config.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
        idGenerator: (req): string =>
          (req.headers['x-request-id'] as string | undefined) ??
          Math.random().toString(36).slice(2),
        setup: (cls, req) => {
          cls.set('ip', req.ip);
          cls.set('userAgent', req.headers['user-agent']);
        },
      },
    }),
    AppConfigModule,
    PrismaModule,
    AuditModule,
    AuthModule,
    HealthModule,
    UsersModule,
    ParentOrganizationsModule,
    OrganizationsModule,
    PatientsModule,
    MedicationsModule,
    PharmaciesModule,
    PricingModule,
    LocationsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
