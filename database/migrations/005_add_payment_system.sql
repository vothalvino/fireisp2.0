-- Add payment system enhancements for flexible payment registration

-- Add credit balance to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS credit_balance DECIMAL(10, 2) DEFAULT 0.00;

-- Modify payments table to support payments without invoices
-- invoice_id is now optional (nullable) to support direct credit payments
-- Use DO block to handle case where NOT NULL constraint may not exist
DO $$ 
BEGIN
    ALTER TABLE payments ALTER COLUMN invoice_id DROP NOT NULL;
EXCEPTION
    WHEN others THEN
        -- Constraint doesn't exist or already dropped, continue
        RAISE NOTICE 'invoice_id NOT NULL constraint does not exist or already dropped';
END $$;

-- Add client_id to payments table for direct credit payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);

-- Add constraint to ensure either invoice_id or client_id is set
DO $$ 
BEGIN
    ALTER TABLE payments ADD CONSTRAINT check_payment_reference 
        CHECK (invoice_id IS NOT NULL OR client_id IS NOT NULL);
EXCEPTION
    WHEN duplicate_object THEN
        -- Constraint already exists, continue
        RAISE NOTICE 'check_payment_reference constraint already exists';
END $$;

-- Create payment_allocations table to track which invoices were paid by each payment
CREATE TABLE IF NOT EXISTS payment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT positive_allocation_amount CHECK (amount > 0)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_invoice_id ON payment_allocations(invoice_id);

-- Add amount_paid column to invoices for tracking total paid amount
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10, 2) DEFAULT 0.00;

-- Update existing invoices to calculate amount_paid from existing payments
UPDATE invoices 
SET amount_paid = COALESCE((
    SELECT SUM(p.amount) 
    FROM payments p 
    WHERE p.invoice_id = invoices.id
), 0.00)
WHERE amount_paid = 0.00;

-- Create trigger to update invoice status and amount_paid when payment_allocations change
CREATE OR REPLACE FUNCTION update_invoice_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the invoice's amount_paid
    UPDATE invoices 
    SET amount_paid = COALESCE((
        SELECT SUM(pa.amount)
        FROM payment_allocations pa
        WHERE pa.invoice_id = 
            CASE 
                WHEN TG_OP = 'DELETE' THEN OLD.invoice_id
                ELSE NEW.invoice_id
            END
    ), 0.00)
    WHERE id = CASE 
        WHEN TG_OP = 'DELETE' THEN OLD.invoice_id
        ELSE NEW.invoice_id
    END;
    
    -- Update invoice status based on payment
    UPDATE invoices 
    SET status = CASE 
        WHEN amount_paid >= total THEN 'paid'
        WHEN amount_paid > 0 THEN 'partial'
        ELSE status
    END
    WHERE id = CASE 
        WHEN TG_OP = 'DELETE' THEN OLD.invoice_id
        ELSE NEW.invoice_id
    END;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for payment_allocations
DROP TRIGGER IF EXISTS trigger_update_invoice_on_allocation_insert ON payment_allocations;
CREATE TRIGGER trigger_update_invoice_on_allocation_insert
    AFTER INSERT ON payment_allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_payment_status();

DROP TRIGGER IF EXISTS trigger_update_invoice_on_allocation_update ON payment_allocations;
CREATE TRIGGER trigger_update_invoice_on_allocation_update
    AFTER UPDATE ON payment_allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_payment_status();

DROP TRIGGER IF EXISTS trigger_update_invoice_on_allocation_delete ON payment_allocations;
CREATE TRIGGER trigger_update_invoice_on_allocation_delete
    AFTER DELETE ON payment_allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_payment_status();
