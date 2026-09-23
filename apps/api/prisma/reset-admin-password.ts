/**
 * Sets the admin password to SEED_ADMIN_PASSWORD from .env.
 * Use it after changing the password in .env (the seed only creates a new admin).
 * Also unlocks the account and logs out all its sessions.
 */
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const username = (process.env.SEED_ADMIN_USERNAME ?? 'admin').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error('Set SEED_ADMIN_PASSWORD (at least 8 characters) in .env');
  }
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) throw new Error(`User "${username}" not found. Run the seed first: npm run prisma:seed`);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
        isActive: true,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    }),
    prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
  ]);
  console.log(`Password of "${username}" updated from SEED_ADMIN_PASSWORD.`);
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
