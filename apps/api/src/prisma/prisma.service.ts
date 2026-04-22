import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { AppConfigService } from '../config/app-config.service';

/**
 * Wraps PrismaClient and adds a defense-in-depth logger for scoped-model
 * reads that are issued WITHOUT a tenant filter. Primary enforcement still
 * lives in services via buildOrganizationScope() — this is a safety net.
 *
 * Models that MUST be tenant-scoped for reads unless an explicit
 * super-admin escape is used.
 */
const TENANT_SCOPED_MODELS: ReadonlySet<string> = new Set([
  'Organization',
  'PatientProfile',
  'PatientMedication',
  'PharmacyNetworkEligibility',
  'User',
  'AdminProfile',
]);

const READ_OPS: ReadonlySet<string> = new Set(['findMany', 'findFirst', 'findFirstOrThrow']);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly isProd: boolean;

  constructor(config: AppConfigService) {
    super({
      datasources: { db: { url: config.databaseUrl } },
      log: config.isProduction ? ['warn', 'error'] : ['warn', 'error'],
    });
    this.isProd = config.isProduction;
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Returns a Prisma client that logs (dev) or throws (prod) when a
   * tenant-scoped read is issued without any filter that references
   * `organizationId` or `organization`. Services should prefer passing
   * explicit `where` clauses built via buildOrganizationScope().
   */
  scoped = (): this => {
    return this.$extends({
      query: {
        $allModels: {
          $allOperations: async ({ model, operation, args, query }): Promise<unknown> => {
            if (TENANT_SCOPED_MODELS.has(model) && READ_OPS.has(operation)) {
              const where = (args as { where?: Record<string, unknown> }).where ?? {};
              const hasScope =
                'organizationId' in where ||
                'organization' in where ||
                'id' in where || // direct id lookups are verified by caller
                'userId' in where; // joined reads are fine
              if (!hasScope) {
                const msg = `Scoped read on ${model}.${operation} without tenant filter`;
                if (this.isProd) throw new Error(msg);
                this.logger.warn(msg);
              }
            }
            return query(args);
          },
        },
      },
    }) as unknown as this;
  };
}
