import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Provided via docker-compose / environment when running CLI commands.
    url: process.env.DATABASE_URL ?? '',
  },
});

