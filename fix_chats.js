const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const users = await prisma.appUser.findMany();
  console.log("Users:");
  for (const u of users) {
    console.log(u.id, u.name, u.email, u.role);
    // Create a support chat for this user if they don't have one
    const existingSupport = await prisma.appChat.findFirst({
      where: { type: 'support', participants: { has: u.id } }
    });
    if (!existingSupport && u.role !== 'Super Admin') { // Skip super admin maybe? or just do it for everyone
      console.log("Creating support chat for", u.name);
      await prisma.appChat.create({
        data: {
          type: 'support',
          participants: [u.id]
        }
      });
    }
  }

  const chats = await prisma.appChat.findMany();
  console.log("\nChats:");
  console.log(chats);
}
run();
