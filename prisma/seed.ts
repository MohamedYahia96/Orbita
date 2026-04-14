import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log(`Start seeding ...`)
  
  // Create an initial user
  const user = await prisma.user.upsert({
    where: { email: 'admin@orbita.local' },
    update: {},
    create: {
      name: 'Orbita Admin',
      email: 'admin@orbita.local',
      theme: 'dark',
      locale: 'en',
    },
  })
  
  console.log(`Added initial user with id: ${user.id}`)
  
  console.log(`Seeding finished.`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
