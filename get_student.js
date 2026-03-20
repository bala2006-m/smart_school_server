const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'mysql://root:bala30012006@localhost:3306/ramchin_smart_school_local'
    }
  }
});

async function main() {
  const student = await prisma.student.findFirst({
    where: { school_id: 1 }
  });
  console.log(JSON.stringify(student));
  await prisma.$disconnect();
}

main();
