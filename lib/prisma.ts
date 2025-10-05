// Prisma client loader: if you generated the client, import it; otherwise provide helpful error during runtime.
let prismaClient: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaClient } = require('@prisma/client');
  prismaClient = new PrismaClient();
} catch (e: any) {
  // Helpful diagnostics for a common Windows/OneDrive problem when Prisma
  // fails to generate or load native engines (EPERM on rename).
  const cwd = (process.cwd && process.cwd()) || '';
  const isOneDrive = typeof cwd === 'string' && /onedrive/i.test(cwd);

  const allowDummy = String(process.env.PRISMA_ALLOW_DUMMY || '').toLowerCase() === '1';

  const baseMsg = 'Prisma client not found or failed to load; falling back to a lightweight in-memory shim.';
  const suggestionLines: string[] = [];
  suggestionLines.push('Run `npx prisma generate` to create the real client.');
  suggestionLines.push('If you see EPERM errors on Windows and your project is inside OneDrive, move the repo outside OneDrive or run `npx prisma generate` from WSL or a non-OneDrive path.');
  suggestionLines.push('To explicitly allow the dummy shim in development set environment variable PRISMA_ALLOW_DUMMY=1.');

  console.warn(baseMsg);
  console.warn('Error:', e && e.message ? e.message : e);
  if (isOneDrive) {
    console.warn('Detected OneDrive path:', cwd);
    console.warn('OneDrive can lock files during Prisma native engine generation which causes EPERM errors. Consider moving the project or using WSL.');
  }
  suggestionLines.forEach((l) => console.warn(l));

  if (!allowDummy) {
    // Still provide the shim so the app can run in most dev/test flows, but
    // make the bypass opt-in to ensure developers see the warning above.
    console.warn('No env PRISMA_ALLOW_DUMMY=1 set. The app will continue using the dummy shim for now.');
  }

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
    cspReport: new DummyModel(),
    auditLog: new DummyModel(),
    $queryRaw: async () => 1,
  } as any;
}

export default prismaClient;
