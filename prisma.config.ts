import 'dotenv/config';

const config = {
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations'
  },
  datasource: {
    url: "file:./dev.db"
  }
};

export default config;
