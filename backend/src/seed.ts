import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // Clear existing data
    await prisma.mLMCommission.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.roomMember.deleteMany();
    await prisma.room.deleteMany();
    await prisma.user.deleteMany();

    console.log('🗑️  Cleared existing data');

    // Create demo users
    const hashedPassword = await bcrypt.hash('demo123', 12);

    // Create root user (demo user)
    const demoUser = await prisma.user.create({
      data: {
        email: 'demo@example.com',
        username: 'demo_user',
        firstName: 'Demo',
        lastName: 'User',
        password: hashedPassword,
        membershipExpiry: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000), // 28 days
        isActive: true,
        totalEarnings: 42.0
      }
    });

    // Create level 1 users (direct referrals of demo user)
    const level1Users = [];
    for (let i = 1; i <= 3; i++) {
      const user = await prisma.user.create({
        data: {
          email: `user.level1.${i}@example.com`,
          username: `level1_user${i}`,
          firstName: `Level1`,
          lastName: `User${i}`,
          password: hashedPassword,
          sponsorId: demoUser.id,
          membershipExpiry: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days
          isActive: true,
          totalEarnings: 15.0 + (i * 5)
        }
      });
      level1Users.push(user);
    }

    // Create level 2 users
    const level2Users = [];
    for (let i = 0; i < level1Users.length; i++) {
      const sponsor = level1Users[i];
      for (let j = 1; j <= 2; j++) {
        const user = await prisma.user.create({
          data: {
            email: `user.level2.${i}.${j}@example.com`,
            username: `level2_user${i}_${j}`,
            firstName: `Level2`,
            lastName: `User${i}_${j}`,
            password: hashedPassword,
            sponsorId: sponsor.id,
            membershipExpiry: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
            isActive: true,
            totalEarnings: 8.0 + (j * 2)
          }
        });
        level2Users.push(user);
      }
    }

    // Create level 3 users
    const level3Users = [];
    for (let i = 0; i < Math.min(level2Users.length, 4); i++) {
      const sponsor = level2Users[i];
      const user = await prisma.user.create({
        data: {
          email: `user.level3.${i}@example.com`,
          username: `level3_user${i}`,
          firstName: `Level3`,
          lastName: `User${i}`,
          password: hashedPassword,
          sponsorId: sponsor.id,
          membershipExpiry: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days
          isActive: true,
          totalEarnings: 3.0 + i
        }
      });
      level3Users.push(user);
    }

    // Create some users without active membership
    for (let i = 1; i <= 2; i++) {
      await prisma.user.create({
        data: {
          email: `inactive.user${i}@example.com`,
          username: `inactive_user${i}`,
          firstName: `Inactive`,
          lastName: `User${i}`,
          password: hashedPassword,
          sponsorId: level1Users[0].id,
          membershipExpiry: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Expired 5 days ago
          isActive: false,
          totalEarnings: 0
        }
      });
    }

    console.log('👥 Created demo users with MLM structure');

    // Create demo rooms
    const rooms = [
      {
        name: 'Tecnología y Programación',
        topic: 'Desarrollo de Software',
        description: 'Sala para discutir las últimas tendencias en tecnología y programación',
        creatorId: demoUser.id
      },
      {
        name: 'Emprendimiento Digital',
        topic: 'Negocios Online',
        description: 'Comparte experiencias sobre emprendimiento y negocios digitales',
        creatorId: level1Users[0].id
      },
      {
        name: 'Marketing y Ventas',
        topic: 'Estrategias de Marketing',
        description: 'Discusión sobre técnicas de marketing digital y ventas online',
        creatorId: level1Users[1].id
      },
      {
        name: 'Inversiones y Finanzas',
        topic: 'Educación Financiera',
        description: 'Aprende sobre inversiones, criptomonedas y educación financiera',
        creatorId: level2Users[0].id
      }
    ];

    const createdRooms = [];
    for (const roomData of rooms) {
      const room = await prisma.room.create({
        data: roomData
      });
      createdRooms.push(room);
    }

    console.log('🏠 Created demo rooms');

    // Add some room members
    await prisma.roomMember.create({
      data: {
        roomId: createdRooms[0].id,
        userId: level1Users[0].id
      }
    });

    await prisma.roomMember.create({
      data: {
        roomId: createdRooms[0].id,
        userId: level1Users[1].id
      }
    });

    await prisma.roomMember.create({
      data: {
        roomId: createdRooms[1].id,
        userId: demoUser.id
      }
    });

    console.log('🚪 Added users to rooms');

    // Create demo payments
    const payments = [];

    // Demo user payment
    const demoPayment = await prisma.payment.create({
      data: {
        userId: demoUser.id,
        amount: 10,
        currency: 'USDT',
        transactionHash: '0x1234567890abcdef1234567890abcdef12345678',
        status: 'COMPLETED',
        membershipExtension: 28
      }
    });
    payments.push(demoPayment);

    // Level 1 user payments
    for (let i = 0; i < level1Users.length; i++) {
      const payment = await prisma.payment.create({
        data: {
          userId: level1Users[i].id,
          amount: 10,
          currency: i % 2 === 0 ? 'USDT' : 'USDC',
          transactionHash: `0xabcdef${i}234567890abcdef1234567890abcdef12345`,
          status: 'COMPLETED',
          membershipExtension: 28
        }
      });
      payments.push(payment);
    }

    // Level 2 user payments
    for (let i = 0; i < Math.min(level2Users.length, 4); i++) {
      const payment = await prisma.payment.create({
        data: {
          userId: level2Users[i].id,
          amount: 10,
          currency: 'BUSD',
          transactionHash: `0xfedcba${i}876543210fedcba0987654321fedcba09`,
          status: 'COMPLETED',
          membershipExtension: 28
        }
      });
      payments.push(payment);
    }

    console.log('💳 Created demo payments');

    // Create MLM commissions for level 1 user payments
    for (let i = 0; i < level1Users.length; i++) {
      const payment = payments[i + 1]; // Skip demo user payment

      // Level 1 commission to demo user ($3.5)
      await prisma.mLMCommission.create({
        data: {
          fromUserId: level1Users[i].id,
          toUserId: demoUser.id,
          level: 1,
          amount: 3.5, // $3.5 for level 1
          paymentId: payment.id,
          status: 'PAID'
        }
      });
    }

    // Create MLM commissions for level 2 user payments
    for (let i = 0; i < Math.min(level2Users.length, 4); i++) {
      const level2User = level2Users[i];
      const payment = payments[payments.length - 4 + i]; // Last 4 payments

      // Find sponsor chain
      const sponsor = await prisma.user.findUnique({
        where: { id: level2User.sponsorId! },
        include: { sponsor: true }
      });

      if (sponsor) {
        // Level 1 commission to direct sponsor ($3.5)
        await prisma.mLMCommission.create({
          data: {
            fromUserId: level2User.id,
            toUserId: sponsor.id,
            level: 1,
            amount: 3.5, // $3.5 for level 1
            paymentId: payment.id,
            status: 'PAID'
          }
        });

        // Level 2 commission to sponsor's sponsor (demo user) ($1)
        if (sponsor.sponsor) {
          await prisma.mLMCommission.create({
            data: {
              fromUserId: level2User.id,
              toUserId: sponsor.sponsor.id,
              level: 2,
              amount: 1, // $1 for level 2
              paymentId: payment.id,
              status: 'PAID'
            }
          });
        }
      }
    }

    // Create additional commissions for level 3 users to demonstrate 5-level system
    for (let i = 0; i < level3Users.length; i++) {
      const level3User = level3Users[i];

      // Create a payment for this level 3 user
      const level3Payment = await prisma.payment.create({
        data: {
          userId: level3User.id,
          amount: 10,
          currency: 'USDT',
          transactionHash: `0x3level${i}567890abcdef1234567890abcdef123456`,
          status: 'COMPLETED',
          membershipExtension: 28
        }
      });

      // Find the complete sponsor chain for level 3 user
      const level2Sponsor = await prisma.user.findUnique({
        where: { id: level3User.sponsorId! },
        include: { sponsor: { include: { sponsor: true } } }
      });

      if (level2Sponsor) {
        // Level 1 commission to direct sponsor ($3.5)
        await prisma.mLMCommission.create({
          data: {
            fromUserId: level3User.id,
            toUserId: level2Sponsor.id,
            level: 1,
            amount: 3.5,
            paymentId: level3Payment.id,
            status: 'PAID'
          }
        });

        // Level 2 commission ($1)
        if (level2Sponsor.sponsor) {
          await prisma.mLMCommission.create({
            data: {
              fromUserId: level3User.id,
              toUserId: level2Sponsor.sponsor.id,
              level: 2,
              amount: 1,
              paymentId: level3Payment.id,
              status: 'PAID'
            }
          });

          // Level 3 commission ($1)
          if (level2Sponsor.sponsor.sponsor) {
            await prisma.mLMCommission.create({
              data: {
                fromUserId: level3User.id,
                toUserId: level2Sponsor.sponsor.sponsor.id,
                level: 3,
                amount: 1,
                paymentId: level3Payment.id,
                status: 'PAID'
              }
            });
          }
        }
      }
    }

    console.log('💰 Created MLM commissions');

    // Create admin user
    await prisma.user.create({
      data: {
        email: 'admin@videochat-mlm.com',
        username: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        password: hashedPassword,
        membershipExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        isActive: true,
        totalEarnings: 0
      }
    });

    console.log('👑 Created admin user');

    console.log('✅ Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Users created: ${await prisma.user.count()}`);
    console.log(`- Rooms created: ${await prisma.room.count()}`);
    console.log(`- Payments created: ${await prisma.payment.count()}`);
    console.log(`- Commissions created: ${await prisma.mLMCommission.count()}`);
    console.log('\n💰 NEW MLM System (5 Levels):');
    console.log('- Level 1: $3.5 USD (Direct referral)');
    console.log('- Levels 2-5: $1 USD each');
    console.log('- Total distributed: $7.5 USD per $10 payment');
    console.log('\n🔑 Demo credentials:');
    console.log('Email: demo@example.com');
    console.log('Password: demo123');
    console.log('\n🔑 Admin credentials:');
    console.log('Email: admin@videochat-mlm.com');
    console.log('Password: demo123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
