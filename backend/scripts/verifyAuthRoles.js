import 'dotenv/config';
import { connectDB } from '../config/database.js';
import { requestOTP, verifyOTP } from '../services/authService.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

async function runTests() {
  console.log('=== Running Auth & Role Security Verification Tests ===\n');
  await connectDB();
  let passed = 0;
  let total = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
    }
  }

  try {
    // Test 1: Resident Login
    const res1 = await verifyOTP({ phone: '9820123456', otp: '123456' });
    assert(res1 && res1.user && res1.user.role === 'resident', 'Scenario 1: Resident (9820123456) authenticates with role resident');

    // Test 2: Vendor Login
    const res2 = await verifyOTP({ phone: '9876543210', otp: '123456' });
    assert(res2 && res2.user && res2.user.role === 'vendor', 'Scenario 2: Vendor (9876543210) authenticates with role vendor');

    // Test 3: Delivery Partner Login
    const res3 = await verifyOTP({ phone: '8888888888', otp: '123456' });
    assert(res3 && res3.user && (res3.user.role === 'delivery_partner' || res3.user.role === 'courier'), 'Scenario 3: Delivery Partner (8888888888) authenticates with role delivery_partner');

    // Test 4: Admin Login
    const res4 = await verifyOTP({ phone: '9999999999', otp: '123456' });
    assert(res4 && res4.user && res4.user.role === 'admin', 'Scenario 4: Admin (9999999999) authenticates with role admin');

    // Test 5: Role spoofing during registration (Admin)
    const testAdminPhone = '9111111111';
    await User.deleteOne({ phone: { $in: [testAdminPhone, `+91${testAdminPhone}`] } });
    try {
      await requestOTP({ phone: testAdminPhone, role: 'admin' });
      // If it allowed or coerced, verify DB role is NOT admin
      const created = await User.findOne({ phone: { $in: [testAdminPhone, `+91${testAdminPhone}`] } });
      assert(!created || created.role !== 'admin', 'Scenario 5: Public signup requesting admin role is rejected or coerced away from admin');
    } catch (e) {
      assert(true, 'Scenario 5: Public signup requesting admin role is explicitly rejected: ' + e.message);
    }
    await User.deleteOne({ phone: { $in: [testAdminPhone, `+91${testAdminPhone}`] } });

    // Test 6: Role spoofing during registration (Delivery Partner)
    const testCourierPhone = '9222222222';
    await User.deleteOne({ phone: { $in: [testCourierPhone, `+91${testCourierPhone}`] } });
    try {
      await requestOTP({ phone: testCourierPhone, role: 'delivery_partner' });
      const created = await User.findOne({ phone: { $in: [testCourierPhone, `+91${testCourierPhone}`] } });
      assert(!created || created.role !== 'delivery_partner', 'Scenario 6: Public signup requesting delivery_partner is rejected or coerced away');
    } catch (e) {
      assert(true, 'Scenario 6: Public signup requesting delivery_partner is explicitly rejected: ' + e.message);
    }
    await User.deleteOne({ phone: { $in: [testCourierPhone, `+91${testCourierPhone}`] } });

    // Test 7: Invalid OTP rejected
    try {
      await verifyOTP({ phone: '9820123456', otp: '000000' });
      assert(false, 'Scenario 7: Invalid OTP should be rejected');
    } catch (e) {
      assert(true, 'Scenario 7: Invalid OTP is properly rejected');
    }

    // Test 8: Non-existent phone in verifyOTP rejected
    try {
      await verifyOTP({ phone: '9000000000', otp: '123456' });
      assert(false, 'Scenario 8: Non-existent phone should fail verifyOTP');
    } catch (e) {
      assert(true, 'Scenario 8: Non-existent phone fails verifyOTP gracefully');
    }

    // Test 9: Form neutrality - Admin entering through resident modal
    const resAdminViaResidentModal = await verifyOTP({ phone: '9999999999', otp: '123456', role: 'resident' });
    assert(resAdminViaResidentModal.user.role === 'admin', 'Scenario 9: Admin entering via resident form preserves genuine admin role from DB');

    // Test 10: Form neutrality - Delivery entering through vendor modal
    const resCourierViaVendorModal = await verifyOTP({ phone: '8888888888', otp: '123456', role: 'vendor' });
    assert(resCourierViaVendorModal.user.role === 'delivery_partner', 'Scenario 10: Courier entering via vendor form preserves genuine delivery_partner role from DB');

    console.log(`\n=== Verification Complete: ${passed}/${total} Passed ===`);
  } catch (err) {
    console.error('Fatal test error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(passed === total ? 0 : 1);
  }
}

runTests();
