import { describe, expect, it, vi } from 'vitest';

vi.mock('cloudflare:workers', () => ({
  DurableObject: class {},
  WorkerEntrypoint: class {
    constructor(
      readonly ctx: unknown,
      readonly env: unknown,
    ) {}
  },
}));

const { default: worker, runCron, Cron } = await import('./worker');

function fakeEnv() {
  const tick = vi.fn(async () => {});
  const env = { GROUP: { idFromName: () => 'id', get: () => ({ tick }) } };
  return { env: env as never, tick };
}

describe('cron entry points', () => {
  const ctx = {} as ExecutionContext;

  it('runCron ticks the group', async () => {
    const { env, tick } = fakeEnv();
    await runCron(env, ctx);
    expect(tick).toHaveBeenCalledTimes(1);
  });

  it('scheduled() does the same as runCron', async () => {
    const { env, tick } = fakeEnv();
    await worker.scheduled!({} as never, env, ctx);
    expect(tick).toHaveBeenCalledTimes(1);
  });

  it('Cron.tick does the same as runCron', async () => {
    const { env, tick } = fakeEnv();
    await new (Cron as never as new (c: unknown, e: unknown) => { tick(): Promise<void> })(ctx, env).tick();
    expect(tick).toHaveBeenCalledTimes(1);
  });
});
