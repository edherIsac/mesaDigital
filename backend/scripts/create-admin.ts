import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/users/users.service';
import { UserRole } from '../src/users/schemas/user.schema';

async function run() {
  const logger = new Logger('create-admin');
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const usersService = app.get(UsersService);

    const email = process.env.ADMIN_EMAIL ?? 'admin@local.test';
    const password = process.env.ADMIN_PASSWORD ?? 'Admin123!';
    const name = process.env.ADMIN_NAME ?? 'root';

    const existing = await usersService.findByEmail(email);
    if (existing) {
      if (existing.role === UserRole.ADMIN) {
        logger.log(`El usuario admin ya existe: ${email}`);
      } else {
        existing.role = UserRole.ADMIN as any;
        await existing.save();
        logger.log(`Usuario existente actualizado a ADMIN: ${email}`);
      }
      return;
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await usersService.create({
      name,
      email,
      password: hashed,
      role: UserRole.ADMIN,
    } as any);

    logger.log(`Usuario admin creado: ${email} (id: ${user._id})`);
  } catch (err) {
    logger.error('Error creando usuario admin', err as any);
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
