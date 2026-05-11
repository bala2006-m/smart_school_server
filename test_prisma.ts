import { PrismaClient } from '@prisma/client';

const client = new PrismaClient();
console.log(Object.keys(client));
// or just find the properties
for (let key in client) {
  if (!key.startsWith('_') && !key.startsWith('$')) {
    console.log(key);
  }
}
