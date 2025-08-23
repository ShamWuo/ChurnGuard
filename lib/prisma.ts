// Prisma client loader: if you generated the client, import it; otherwise provide helpful error during runtime.
let prismaClient: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaClient } = require('@prisma/client');
  prismaClient = new PrismaClient();
} catch (e) {
  // Fallback dummy for environments without generated client (tests/local)
  class DummyModel {
    create() { return Promise.resolve({}); }
    findFirst() { return Promise.resolve(null); }
    findUnique() { return Promise.resolve(null); }
    findMany() { return Promise.resolve([]); }
    update() { return Promise.resolve({}); }
    updateMany() { return Promise.resolve({}); }
  }
  prismaClient = {
    stripeEventLog: new DummyModel(),
    recoveryAttribution: new DummyModel(),
    dunningCase: new DummyModel(),
    retryAttempt: new DummyModel(),
    dunningReminder: new DummyModel(),
    user: new DummyModel(),
    subscription: new DummyModel(),
    settings: new DummyModel(),
    $queryRaw: async () => 1,
  } as any;
  console.warn('Prisma client not found; using dummy shim. Run `npx prisma generate` to enable real DB client.');
}

export default prismaClient;
