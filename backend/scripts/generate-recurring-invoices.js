#!/usr/bin/env node

/**
 * Recurring Invoice Generation Script
 * 
 * This script should be run daily via cron to automatically generate recurring invoices
 * for active services based on their billing configuration.
 * 
 * Usage:
 *   node scripts/generate-recurring-invoices.js
 * 
 * Cron example (run daily at 2 AM):
 *   0 2 * * * cd /path/to/fireisp2.0/backend && node scripts/generate-recurring-invoices.js >> /var/log/fireisp-invoices.log 2>&1
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'fireisp',
    user: process.env.DB_USER || 'fireisp',
    password: process.env.DB_PASSWORD
});

async function generateRecurringInvoices() {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const today = new Date();
        const currentDay = today.getDate();
        
        console.log(`[${today.toISOString()}] Starting recurring invoice generation...`);
        console.log(`Current day of month: ${currentDay}`);
        
        // Get default billing settings
        const defaultSettings = await client.query(
            `SELECT key, value FROM system_settings 
             WHERE key IN ('default_billing_day', 'default_days_to_pay')`
        );
        
        const settingsMap = {};
        defaultSettings.rows.forEach(row => {
            settingsMap[row.key] = row.value;
        });
        
        const defaultBillingDay = parseInt(settingsMap.default_billing_day) || 1;
        const defaultDaysToPay = parseInt(settingsMap.default_days_to_pay) || 15;
        
        console.log(`Default billing day: ${defaultBillingDay}`);
        console.log(`Default days to pay: ${defaultDaysToPay}`);
        
        // Get all active services that need invoicing
        const servicesToInvoice = await client.query(
            `SELECT cs.*, sp.price, sp.billing_cycle, sp.name as plan_name,
                    c.id as client_id, c.company_name, c.email,
                    COALESCE(cs.billing_day_of_month, $1) as effective_billing_day,
                    COALESCE(cs.days_until_due, $2) as effective_days_until_due
             FROM client_services cs
             JOIN service_plans sp ON cs.service_plan_id = sp.id
             JOIN clients c ON cs.client_id = c.id
             WHERE cs.status = 'active' 
             AND cs.recurring_billing_enabled = true
             AND (
                 COALESCE(cs.billing_day_of_month, $1) = $3
                 OR cs.last_invoice_date IS NULL
                 OR (
                     EXTRACT(MONTH FROM cs.last_invoice_date) != EXTRACT(MONTH FROM CURRENT_DATE)
                     OR EXTRACT(YEAR FROM cs.last_invoice_date) != EXTRACT(YEAR FROM CURRENT_DATE)
                 )
             )`,
            [defaultBillingDay, defaultDaysToPay, currentDay]
        );
        
        console.log(`Found ${servicesToInvoice.rows.length} service(s) to invoice`);
        
        const invoicesCreated = [];
        
        for (const service of servicesToInvoice.rows) {
            // Skip if already invoiced this month
            if (service.last_invoice_date) {
                const lastInvoiceDate = new Date(service.last_invoice_date);
                if (lastInvoiceDate.getMonth() === today.getMonth() && 
                    lastInvoiceDate.getFullYear() === today.getFullYear()) {
                    console.log(`Skipping service ${service.username} - already invoiced this month`);
                    continue;
                }
            }
            
            console.log(`Processing service: ${service.username} (${service.company_name})`);
            
            const issueDate = today.toISOString().split('T')[0];
            const dueDate = new Date(today);
            dueDate.setDate(dueDate.getDate() + service.effective_days_until_due);
            const dueDateStr = dueDate.toISOString().split('T')[0];
            
            // Generate invoice number
            const invoiceNumberResult = await client.query(
                `SELECT COUNT(*) as count FROM invoices 
                 WHERE EXTRACT(YEAR FROM issue_date) = EXTRACT(YEAR FROM CURRENT_DATE)`
            );
            const yearlyCount = parseInt(invoiceNumberResult.rows[0].count) + 1;
            const invoiceNumber = `INV-${today.getFullYear()}-${String(yearlyCount).padStart(5, '0')}`;
            
            const subtotal = parseFloat(service.price);
            const tax = subtotal * 0; // No tax for now
            const total = subtotal + tax;
            
            const description = `${service.plan_name} - ${service.billing_cycle} billing`;
            
            // Create invoice
            const invoiceResult = await client.query(
                `INSERT INTO invoices (
                    invoice_number, client_id, issue_date, due_date,
                    subtotal, tax, total, notes, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
                RETURNING *`,
                [invoiceNumber, service.client_id, issueDate, dueDateStr, 
                 subtotal, tax, total, `Recurring invoice for ${service.username}`]
            );
            
            const invoiceId = invoiceResult.rows[0].id;
            
            // Create invoice item
            await client.query(
                `INSERT INTO invoice_items (
                    invoice_id, client_service_id, description,
                    quantity, unit_price, total
                ) VALUES ($1, $2, $3, $4, $5, $6)`,
                [invoiceId, service.id, description, 1, subtotal, subtotal]
            );
            
            // Update last_invoice_date for this service
            await client.query(
                `UPDATE client_services SET last_invoice_date = $1 WHERE id = $2`,
                [issueDate, service.id]
            );
            
            invoicesCreated.push({
                invoiceNumber,
                clientName: service.company_name,
                serviceName: service.plan_name,
                amount: total
            });
            
            console.log(`Created invoice ${invoiceNumber} for ${service.company_name} - $${total}`);
        }
        
        await client.query('COMMIT');
        
        console.log(`\n[${new Date().toISOString()}] Successfully generated ${invoicesCreated.length} recurring invoice(s)`);
        
        if (invoicesCreated.length > 0) {
            console.log('\nInvoices created:');
            invoicesCreated.forEach(inv => {
                console.log(`  - ${inv.invoiceNumber}: ${inv.clientName} - ${inv.serviceName} - $${inv.amount}`);
            });
        }
        
        process.exit(0);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`[${new Date().toISOString()}] Error generating recurring invoices:`, error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the script
generateRecurringInvoices();
