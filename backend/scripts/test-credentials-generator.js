#!/usr/bin/env node

/**
 * Test script for credentials generator
 */

const { generateUsername, generatePassword, generateRandomString } = require('../src/utils/credentialsGenerator');

console.log('=== Testing Credentials Generator ===\n');

// Test 1: Generate multiple usernames
console.log('Test 1: Generate 5 random usernames');
for (let i = 0; i < 5; i++) {
    const username = generateUsername();
    console.log(`  ${i + 1}. ${username} (length: ${username.length})`);
}

// Test 2: Generate multiple passwords
console.log('\nTest 2: Generate 5 random passwords');
for (let i = 0; i < 5; i++) {
    const password = generatePassword();
    console.log(`  ${i + 1}. ${password} (length: ${password.length})`);
}

// Test 3: Verify no look-alike characters are present
console.log('\nTest 3: Verify no look-alike characters (I, l, 1, O, 0)');
const lookAlikeChars = ['I', 'l', '1', 'O', '0'];
let testsPassed = 0;
let testsFailed = 0;

for (let i = 0; i < 100; i++) {
    const randomStr = generateRandomString(10);
    const hasLookAlike = lookAlikeChars.some(char => randomStr.includes(char));
    if (hasLookAlike) {
        console.log(`  ✗ FAILED: Found look-alike character in: ${randomStr}`);
        testsFailed++;
    } else {
        testsPassed++;
    }
}

console.log(`  ${testsPassed}/100 tests passed`);
if (testsFailed === 0) {
    console.log('  ✓ All tests passed - no look-alike characters found!');
} else {
    console.log(`  ✗ ${testsFailed} tests failed`);
}

// Test 4: Verify randomness (no duplicates in 100 generations)
console.log('\nTest 4: Verify randomness (checking for duplicates in 100 generations)');
const generated = new Set();
for (let i = 0; i < 100; i++) {
    generated.add(generatePassword());
}
console.log(`  Generated ${generated.size} unique passwords out of 100`);
if (generated.size === 100) {
    console.log('  ✓ Perfect randomness - no duplicates found!');
} else {
    console.log(`  ⚠ Found ${100 - generated.size} duplicate(s) (this is very unlikely but possible)`);
}

// Test 5: Show sample credentials
console.log('\nTest 5: Sample complete credentials for a new service:');
for (let i = 0; i < 3; i++) {
    console.log(`  Service ${i + 1}:`);
    console.log(`    Username: ${generateUsername()}`);
    console.log(`    Password: ${generatePassword()}`);
}

console.log('\n=== All Tests Complete ===');
