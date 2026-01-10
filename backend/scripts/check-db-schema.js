#!/usr/bin/env node

/**
 * Database Schema Checker
 * Verifies that all required tables and columns exist for the payment system
 */

const db = require('../src/utils/database');

async function checkSchema() {
    console.log('🔍 Checking database schema...\n');
    
    const checks = [];
    
    try {
        // Check if amount_paid column exists in invoices table
        const columnCheck = await db.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'invoices' 
            AND column_name = 'amount_paid'
        `);
        
        if (columnCheck.rows.length > 0) {
            console.log('✅ invoices.amount_paid column exists');
            checks.push({ name: 'invoices.amount_paid', status: 'ok' });
        } else {
            console.log('❌ invoices.amount_paid column is MISSING');
            console.log('   This column is required for payment tracking');
            console.log('   Run migration 005_add_payment_system.sql to add it');
            checks.push({ name: 'invoices.amount_paid', status: 'missing' });
        }
        
        // Check if payment_allocations table exists
        const tableCheck = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name = 'payment_allocations'
        `);
        
        if (tableCheck.rows.length > 0) {
            console.log('✅ payment_allocations table exists');
            checks.push({ name: 'payment_allocations', status: 'ok' });
        } else {
            console.log('❌ payment_allocations table is MISSING');
            console.log('   This table is required for payment allocation tracking');
            console.log('   Run migration 005_add_payment_system.sql to add it');
            checks.push({ name: 'payment_allocations', status: 'missing' });
        }
        
        // Check if credit_balance column exists in clients table
        const creditCheck = await db.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'clients' 
            AND column_name = 'credit_balance'
        `);
        
        if (creditCheck.rows.length > 0) {
            console.log('✅ clients.credit_balance column exists');
            checks.push({ name: 'clients.credit_balance', status: 'ok' });
        } else {
            console.log('❌ clients.credit_balance column is MISSING');
            console.log('   This column is required for client credit tracking');
            console.log('   Run migration 005_add_payment_system.sql to add it');
            checks.push({ name: 'clients.credit_balance', status: 'missing' });
        }
        
        // Test a simple query on invoices to ensure it works
        try {
            const testQuery = await db.query(`
                SELECT i.id, i.total, COALESCE(i.amount_paid, 0) as amount_paid
                FROM invoices i
                LIMIT 1
            `);
            console.log('✅ Test query on invoices table successful');
            checks.push({ name: 'invoices query test', status: 'ok' });
        } catch (testError) {
            console.log('❌ Test query on invoices table FAILED');
            console.log('   Error:', testError.message);
            checks.push({ name: 'invoices query test', status: 'failed', error: testError.message });
        }
        
        console.log('\n📊 Summary:');
        const failed = checks.filter(c => c.status !== 'ok').length;
        const passed = checks.filter(c => c.status === 'ok').length;
        
        console.log(`   Passed: ${passed}/${checks.length}`);
        console.log(`   Failed: ${failed}/${checks.length}`);
        
        if (failed > 0) {
            console.log('\n⚠️  Some schema checks failed!');
            console.log('   Please run the database migrations to fix these issues:');
            console.log('   ./database/check-migrations.sh');
            process.exit(1);
        } else {
            console.log('\n✅ All schema checks passed!');
            process.exit(0);
        }
        
    } catch (error) {
        console.error('❌ Schema check failed with error:', error);
        process.exit(1);
    }
}

// Run the check
checkSchema().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
