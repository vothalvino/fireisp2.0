# Payment API Documentation

## Base URL
```
/api/payments
```

## Authentication
All endpoints require JWT authentication via Bearer token in the Authorization header.

```
Authorization: Bearer <token>
```

---

## Endpoints

### 1. Get Client's Unpaid Invoices

Retrieves all unpaid invoices for a specific client.

**Endpoint:** `GET /api/payments/client/:clientId/unpaid-invoices`

**URL Parameters:**
- `clientId` (required) - UUID of the client

**Response:** `200 OK`
```json
[
  {
    "id": "invoice-uuid",
    "invoice_number": "INV-001",
    "client_id": "client-uuid",
    "issue_date": "2024-01-01",
    "due_date": "2024-01-31",
    "total": "100.00",
    "amount_paid": "0.00",
    "amount_due": "100.00",
    "status": "pending"
  }
]
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token
- `500 Internal Server Error` - Database error

---

### 2. Get Client Credit Balance

Retrieves the current credit balance for a client.

**Endpoint:** `GET /api/payments/client/:clientId/credit`

**URL Parameters:**
- `clientId` (required) - UUID of the client

**Response:** `200 OK`
```json
{
  "clientId": "client-uuid",
  "creditBalance": 150.50
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - Client not found
- `500 Internal Server Error` - Database error

---

### 3. Register Payment

Registers a new payment with optional invoice allocations.

**Endpoint:** `POST /api/payments`

**Request Body:**
```json
{
  "clientId": "client-uuid",
  "amount": 250.00,
  "paymentDate": "2024-01-09",
  "paymentMethod": "cash",
  "transactionId": "TXN-12345",
  "notes": "Payment received in full",
  "invoiceAllocations": [
    {
      "invoiceId": "invoice-uuid-1",
      "amount": 100.00
    },
    {
      "invoiceId": "invoice-uuid-2",
      "amount": 100.00
    }
  ]
}
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| clientId | UUID | Yes | Client making the payment |
| amount | Decimal | Yes | Total payment amount (must be > 0) |
| paymentDate | Date | Yes | Date payment was received |
| paymentMethod | String | Yes | Method of payment |
| transactionId | String | No | Reference/transaction ID |
| notes | String | No | Additional notes |
| invoiceAllocations | Array | No | List of invoice allocations |
| invoiceAllocations[].invoiceId | UUID | Yes* | Invoice to apply payment to |
| invoiceAllocations[].amount | Decimal | Yes* | Amount to apply to invoice |

*Required if invoiceAllocations array is provided

**Payment Methods:**
- `cash`
- `check`
- `bank_transfer`
- `credit_card`
- `debit_card`
- `mobile_payment`
- `other`

**Response:** `201 Created`
```json
{
  "payment": {
    "id": "payment-uuid",
    "client_id": "client-uuid",
    "amount": "250.00",
    "payment_date": "2024-01-09",
    "payment_method": "cash",
    "transaction_id": "TXN-12345",
    "notes": "Payment received in full",
    "created_at": "2024-01-09T10:30:00Z"
  },
  "totalAllocated": 200.00,
  "creditAdded": 50.00,
  "currentCredit": 200.50
}
```

**Error Responses:**
- `400 Bad Request` - Invalid input data
  ```json
  {
    "error": {
      "message": "Client ID, amount, payment date, and payment method are required"
    }
  }
  ```
- `400 Bad Request` - Invoice not found or doesn't belong to client
  ```json
  {
    "error": {
      "message": "Invoice {id} not found or does not belong to client"
    }
  }
  ```
- `401 Unauthorized` - Invalid or missing token
- `500 Internal Server Error` - Database error

**Business Logic:**
1. Payment is created with total amount
2. If invoiceAllocations provided, amounts are allocated to invoices
3. Allocations cannot exceed invoice amount due
4. Remaining amount (if any) is added to client credit
5. Invoice status is automatically updated via database triggers

---

### 4. Get Payment History

Retrieves payment history for a client with pagination.

**Endpoint:** `GET /api/payments/client/:clientId/history`

**URL Parameters:**
- `clientId` (required) - UUID of the client

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Results per page (default: 20, max: 100)

**Response:** `200 OK`
```json
{
  "payments": [
    {
      "id": "payment-uuid",
      "client_id": "client-uuid",
      "amount": "250.00",
      "payment_date": "2024-01-09",
      "payment_method": "cash",
      "transaction_id": "TXN-12345",
      "notes": "Payment received",
      "created_at": "2024-01-09T10:30:00Z",
      "allocations": [
        {
          "invoiceId": "invoice-uuid-1",
          "invoiceNumber": "INV-001",
          "amount": "100.00"
        },
        {
          "invoiceId": "invoice-uuid-2",
          "invoiceNumber": "INV-002",
          "amount": "100.00"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalCount": 45,
    "totalPages": 3
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token
- `500 Internal Server Error` - Database error

---

### 5. Get Payment Details

Retrieves detailed information about a specific payment.

**Endpoint:** `GET /api/payments/:id`

**URL Parameters:**
- `id` (required) - UUID of the payment

**Response:** `200 OK`
```json
{
  "id": "payment-uuid",
  "client_id": "client-uuid",
  "amount": "250.00",
  "payment_date": "2024-01-09",
  "payment_method": "cash",
  "transaction_id": "TXN-12345",
  "notes": "Payment received",
  "created_at": "2024-01-09T10:30:00Z",
  "company_name": "ABC Company",
  "client_code": "CLI-001",
  "allocations": [
    {
      "id": "allocation-uuid",
      "payment_id": "payment-uuid",
      "invoice_id": "invoice-uuid",
      "invoice_number": "INV-001",
      "invoice_total": "150.00",
      "amount": "100.00",
      "created_at": "2024-01-09T10:30:00Z"
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - Payment not found
- `500 Internal Server Error` - Database error

---

### 6. Get All Payments

Retrieves all payments with optional filtering and pagination.

**Endpoint:** `GET /api/payments`

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Results per page (default: 20, max: 100)
- `clientId` (optional) - Filter by client UUID

**Response:** `200 OK`
```json
{
  "payments": [
    {
      "id": "payment-uuid",
      "client_id": "client-uuid",
      "amount": "250.00",
      "payment_date": "2024-01-09",
      "payment_method": "cash",
      "transaction_id": "TXN-12345",
      "notes": "Payment received",
      "created_at": "2024-01-09T10:30:00Z",
      "company_name": "ABC Company",
      "client_code": "CLI-001"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalCount": 150,
    "totalPages": 8
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token
- `500 Internal Server Error` - Database error

---

## Usage Examples

### Example 1: Pay Multiple Invoices

```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "550e8400-e29b-41d4-a716-446655440000",
    "amount": 300.00,
    "paymentDate": "2024-01-09",
    "paymentMethod": "bank_transfer",
    "transactionId": "BANK-12345",
    "invoiceAllocations": [
      {
        "invoiceId": "660e8400-e29b-41d4-a716-446655440001",
        "amount": 150.00
      },
      {
        "invoiceId": "660e8400-e29b-41d4-a716-446655440002",
        "amount": 150.00
      }
    ]
  }'
```

### Example 2: Overpayment (Credit)

```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "550e8400-e29b-41d4-a716-446655440000",
    "amount": 500.00,
    "paymentDate": "2024-01-09",
    "paymentMethod": "cash",
    "invoiceAllocations": [
      {
        "invoiceId": "660e8400-e29b-41d4-a716-446655440001",
        "amount": 150.00
      }
    ]
  }'
```
Result: $150 applied to invoice, $350 added to credit.

### Example 3: Direct Credit Payment

```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "550e8400-e29b-41d4-a716-446655440000",
    "amount": 200.00,
    "paymentDate": "2024-01-09",
    "paymentMethod": "check",
    "transactionId": "CHK-98765",
    "notes": "Advance payment for future invoices"
  }'
```
Result: Full $200 added to credit (no invoices specified).

### Example 4: Partial Payment

```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "550e8400-e29b-41d4-a716-446655440000",
    "amount": 75.00,
    "paymentDate": "2024-01-09",
    "paymentMethod": "mobile_payment",
    "invoiceAllocations": [
      {
        "invoiceId": "660e8400-e29b-41d4-a716-446655440001",
        "amount": 75.00
      }
    ]
  }'
```
Result: Invoice marked as 'partial', remaining balance still due.

---

## Database Schema

### payments Table
```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id),
    invoice_id UUID REFERENCES invoices(id), -- Now nullable
    amount DECIMAL(10, 2),
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50),
    transaction_id VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_payment_reference 
        CHECK (invoice_id IS NOT NULL OR client_id IS NOT NULL)
);
```

### payment_allocations Table
```sql
CREATE TABLE payment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT positive_allocation_amount CHECK (amount > 0)
);
```

---

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "error": {
    "message": "Human-readable error message"
  }
}
```

HTTP Status Codes:
- `200 OK` - Request succeeded
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Authentication required
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Rate Limiting

No rate limiting is currently implemented. Consider adding rate limiting for production deployments.

---

## Versioning

API Version: 1.0
Base URL includes API version: `/api/payments`

---

## Support

For issues or questions:
1. Check `PAYMENT_SYSTEM_TESTING.md` for testing guidance
2. Review `PAYMENT_SYSTEM_FEATURE.md` for feature overview
3. Examine inline code comments in `backend/src/routes/payments.js`
4. Open a GitHub issue with reproduction steps
