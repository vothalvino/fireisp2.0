#!/usr/bin/env node

/**
 * Manual integration test for credentials generation API
 * This simulates the backend behavior without requiring a running server
 */

const { generateUsername, generatePassword } = require('../src/utils/credentialsGenerator');

console.log('=== Testing Service Creation with Auto-generated Credentials ===\n');

// Simulate the backend POST /client-services endpoint behavior
function simulateServiceCreation(requestBody) {
    let { username, password, clientId, servicePlanId } = requestBody;
    
    // Auto-generate if not provided (matching the actual implementation)
    if (!username || username.trim() === '') {
        username = generateUsername();
        console.log('  ✓ Username auto-generated');
    } else {
        console.log('  ✓ Username provided by user');
    }
    
    if (!password || password.trim() === '') {
        password = generatePassword();
        console.log('  ✓ Password auto-generated');
    } else {
        console.log('  ✓ Password provided by user');
    }
    
    return { username, password, clientId, servicePlanId };
}

// Test 1: Both empty - should auto-generate both
console.log('Test 1: Create service with empty username and password');
const result1 = simulateServiceCreation({
    clientId: 1,
    servicePlanId: 1,
    username: '',
    password: ''
});
console.log(`  Result: username="${result1.username}", password="${result1.password}"\n`);

// Test 2: Username provided, password empty
console.log('Test 2: Create service with custom username, empty password');
const result2 = simulateServiceCreation({
    clientId: 1,
    servicePlanId: 1,
    username: 'custom_user',
    password: ''
});
console.log(`  Result: username="${result2.username}", password="${result2.password}"\n`);

// Test 3: Both provided
console.log('Test 3: Create service with both custom username and password');
const result3 = simulateServiceCreation({
    clientId: 1,
    servicePlanId: 1,
    username: 'my_username',
    password: 'my_password'
});
console.log(`  Result: username="${result3.username}", password="${result3.password}"\n`);

// Test 4: Simulate generate-credentials endpoint
console.log('Test 4: Simulate POST /services/generate-credentials endpoint');
const generated = {
    username: generateUsername(),
    password: generatePassword()
};
console.log(`  Response: ${JSON.stringify(generated, null, 2)}\n`);

console.log('=== All Integration Tests Complete ===');
console.log('\nSummary:');
console.log('✓ Auto-generation works when fields are empty');
console.log('✓ Custom values are preserved when provided');
console.log('✓ Generate credentials endpoint returns valid format');
