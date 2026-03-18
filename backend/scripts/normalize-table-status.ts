import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { TablesService } from '../src/orders/tables.service';

function normalizeStatus(s?: string): string | undefined {
  if (!s || typeof s !== 'string') return undefined;
  const st = s.trim().toLowerCase();
  if (st === 'active') return 'available';
  if (st === 'disponible' || st === 'available') return 'available';
  if (st === 'ocupada' || st === 'ocupado' || st === 'occupied')
    return 'occupied';
  if (st === 'reservada' || st === 'reserved') return 'reserved';
  if (st === 'blocked' || st === 'bloqueada' || st === 'bloqueado')
    return 'blocked';
  return st;
}

async function run() {
  const logger = new Logger('normalize-table-status');
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const tablesService = app.get(TablesService);
    const tables = await tablesService.findAll();
    for (const t of tables as any[]) {
      const current = t.status as string | undefined;
      const normalized = normalizeStatus(current);
      if (normalized && normalized !== current) {
        await tablesService.update(String(t._id ?? t.id), {
          status: normalized,
        } as any);
        logger.log(
          `Updated table ${t.label} (${t._id ?? t.id}): '${current}' -> '${normalized}'`,
        );
      }
    }
    logger.log('Migration finished');
  } catch (err) {
    logger.error('Migration failed', err as any);
    process.exit(1);
  } finally {
    await app.close();
  }
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
