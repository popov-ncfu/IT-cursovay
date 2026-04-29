import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL env var is required for PrismaService.');
    }

    // Prisma 7 requires a driver adapter for database connectivity.
    const pool = new Pool({ connectionString: databaseUrl });
    const adapter = new PrismaPg(pool);

    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Ensures Nest closes gracefully and Prisma disconnects on shutdown.
   * Call this once from `main.ts`.
   */
  enableShutdownHooks(app: INestApplication) {
    const shutdown = async () => {
      try {
        await this.$disconnect();
      } finally {
        await app.close();
      }
    };

    process.once('SIGINT', () => {
      void shutdown();
    });
    process.once('SIGTERM', () => {
      void shutdown();
    });
    process.once('beforeExit', () => {
      void shutdown();
    });
  }
}
