import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

async function testAuthFlow() {
  console.log('🧪 Testing Local PostgreSQL Credential Authentication & Password Cross-Verification...\n');

  const testEmail = 'drsawant.test@novelcore.ai';
  const testPassword = 'SecurePassword123!';
  const testName = 'Dr. Sawant';

  try {
    // 1. Clean up old test user if exists
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });
    console.log('🧹 Cleaned up existing test user.');

    // 2. Simulate Registration / Account Creation (Signup)
    console.log('--- TEST 1: Account Creation & Hashing ---');
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    const createdUser = await prisma.user.create({
      data: {
        email: testEmail,
        name: testName,
        password: hashedPassword,
      },
    });

    if (!createdUser || !createdUser.password) {
      throw new Error('FAILED: User was not created with a hashed password in PostgreSQL!');
    }
    console.log('✅ 1. Account Created & Stored in PostgreSQL!');
    console.log(`   User ID: ${createdUser.id}`);
    console.log(`   Email: ${createdUser.email}`);
    console.log(`   Name: ${createdUser.name}`);
    console.log(`   Hashed Password: ${createdUser.password.substring(0, 20)}...`);

    // 3. Simulate Login with Correct Credentials
    console.log('\n--- TEST 2: Login with Correct Credentials ---');
    const dbUser = await prisma.user.findUnique({
      where: { email: testEmail },
    });

    if (!dbUser || !dbUser.password) {
      throw new Error('FAILED: Could not retrieve user from database during login!');
    }

    const isMatch = await bcrypt.compare(testPassword, dbUser.password);
    if (!isMatch) {
      throw new Error('FAILED: Correct password comparison failed!');
    }
    console.log('✅ 2. Correct Credentials Successfully Cross-Verified & Authenticated!');

    // 4. Simulate Login with Incorrect Password
    console.log('\n--- TEST 3: Login with Incorrect Password ---');
    const isWrongMatch = await bcrypt.compare('WrongPassword999', dbUser.password);
    if (isWrongMatch) {
      throw new Error('FAILED: Incorrect password should have been rejected!');
    }
    console.log('✅ 3. Incorrect Password Properly Rejected by Cross-Verification Guard!');

    // 5. Cleanup test user
    await prisma.user.delete({
      where: { id: createdUser.id },
    });
    console.log('\n🧹 Test user cleaned up.');

    console.log('\n🎉 ALL AUTHENTICATION TESTS PASSED 100%!');
  } catch (err: any) {
    console.error('❌ Test Failed:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testAuthFlow();
