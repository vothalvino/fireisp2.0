# Recurring Invoices - UI Guide

This guide shows the user interface changes for the recurring invoice feature.

## 1. Company Settings - Billing Configuration

**Location:** Settings → Company Tab

### New Section: Default Recurring Billing Configuration

```
┌─────────────────────────────────────────────────────────────┐
│ Company Information                                          │
├─────────────────────────────────────────────────────────────┤
│ [Company Name] [Company Email]                              │
│ [Company Phone] [Company Address]                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Default Recurring Billing Configuration                      │
│                                                              │
│ These settings define when invoices are automatically        │
│ generated for services that don't have custom billing        │
│ settings.                                                    │
│                                                              │
│ Default Billing Day (1-28):  [  1  ]                        │
│ ℹ Day of the month when recurring invoices are generated    │
│                                                              │
│ Default Days to Pay:         [ 15  ]                        │
│ ℹ Number of days from invoice date until payment is due     │
│                                                              │
│                              [Save Company Information]      │
└─────────────────────────────────────────────────────────────┘
```

**Fields:**
- **Default Billing Day**: 1-28 (default: 1)
  - The day of month when invoices are generated
  - Safe range to avoid month-end issues
  
- **Default Days to Pay**: 1-90 (default: 15)
  - Number of days customers have to pay
  - Applied to invoice due date calculation

## 2. Services Page - Generate Invoices Button

**Location:** Services Page (Header)

### New Button: Generate Invoices

```
┌─────────────────────────────────────────────────────────────┐
│ 📦 Services                                                  │
│ Manage client services and plans                            │
│                                                              │
│          [📄 Generate Invoices] [➕ Add Service]            │
└─────────────────────────────────────────────────────────────┘
```

**Button Actions:**
- Click to manually trigger invoice generation
- Shows confirmation dialog
- Displays summary of created invoices
- Updates immediately without page refresh

## 3. Service Form - Recurring Billing Configuration

**Location:** Services → Add Service / Edit Service

### New Section: Recurring Billing Configuration

```
┌─────────────────────────────────────────────────────────────┐
│ Create Service / Edit Service                                │
├─────────────────────────────────────────────────────────────┤
│ [Client *]              [Service Plan *]                     │
│ [Username *]            [Password *]                         │
│ [IP Address]            [MAC Address]                        │
│ [Activation Date *]     [Expiration Date]                    │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 💳 Recurring Billing Configuration                       ││
│ │                                                           ││
│ │ ☑ Enable automatic recurring invoices for this service   ││
│ │                                                           ││
│ │ When enabled:                                             ││
│ │                                                           ││
│ │ ☑ Use company default billing settings                   ││
│ │                                                           ││
│ │ OR customize settings for this service:                  ││
│ │                                                           ││
│ │ Custom Billing Day (1-28):    [  ]                       ││
│ │ ℹ Day of month to generate invoices for this service     ││
│ │                                                           ││
│ │ Custom Days Until Due:        [  ]                       ││
│ │ ℹ Number of days until invoice payment is due            ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ [Notes]                                                      │
│                                                              │
│                               [Cancel] [Create Service]      │
└─────────────────────────────────────────────────────────────┘
```

**Interactive Behavior:**

1. **Recurring Billing Checkbox**
   - Unchecked: Hides all billing settings
   - Checked: Shows billing configuration options

2. **Use Default Settings Checkbox**
   - Checked: Custom fields are disabled (grayed out)
   - Unchecked: Custom fields are enabled and editable

3. **Custom Fields** (when enabled)
   - Custom Billing Day: Numeric input, 1-28
   - Custom Days Until Due: Numeric input, 1-90
   - Validation on submit

## 4. User Workflows

### Workflow 1: Standard Setup (All Services Same)

```
1. Settings → Company
   └─ Set: Default Billing Day = 1
   └─ Set: Default Days to Pay = 15
   └─ Click: Save

2. Services → Add Service
   └─ Fill service details
   └─ Check: ☑ Enable recurring invoices
   └─ Check: ☑ Use company default settings
   └─ Click: Create Service

3. Services → Click "Generate Invoices"
   └─ Invoices created on day 1, due on day 16
```

### Workflow 2: Custom Settings Per Service

```
1. Settings → Company
   └─ Set: Default Billing Day = 1 (for most)
   └─ Set: Default Days to Pay = 15 (standard)

2. Services → Edit Premium Service
   └─ Check: ☑ Enable recurring invoices
   └─ Uncheck: ☐ Use company default settings
   └─ Set: Custom Billing Day = 15
   └─ Set: Custom Days Until Due = 30
   └─ Click: Update Service

3. Result on day 1:  Standard services invoiced
   Result on day 15: Premium service invoiced
```

### Workflow 3: Manual Invoice Generation

```
1. Services → Click "Generate Invoices"
   
2. Confirmation Dialog:
   ┌─────────────────────────────────────────────┐
   │ Generate recurring invoices for all active  │
   │ services? This will create invoices for     │
   │ services that are due for billing.          │
   │                                             │
   │                    [Cancel] [OK]            │
   └─────────────────────────────────────────────┘

3. Success Message:
   ┌─────────────────────────────────────────────┐
   │ Generated 5 recurring invoice(s)            │
   │                                             │
   │ Invoices created:                           │
   │ INV-2024-123456-abc123 - Acme Corp - $99.99│
   │ INV-2024-123457-def456 - Beta LLC - $49.99 │
   │ ...                                         │
   │                                             │
   │                         [OK]                │
   └─────────────────────────────────────────────┘
```

## 5. Visual Indicators

### Service List - Billing Status

Services can now show their billing configuration:

```
┌──────────────────────────────────────────────────────────────┐
│ Client Services (25)                                          │
├──────────────────────────────────────────────────────────────┤
│ Client    │ Username │ Plan      │ IP       │ Status │ Expires│
├───────────┼──────────┼───────────┼──────────┼────────┼────────┤
│ Acme Corp │ acme001  │ Premium   │ 10.0.0.1 │ Active │ Indef  │
│           │          │           │          │ 💳 Day 1│        │
│ Beta LLC  │ beta001  │ Standard  │ 10.0.0.2 │ Active │ Indef  │
│           │          │           │          │ 💳 Day 15│       │
│ Gamma Inc │ gamma001 │ Basic     │ 10.0.0.3 │ Active │ Indef  │
│           │          │           │          │ 💳 Off  │        │
└──────────────────────────────────────────────────────────────┘
```

Legend:
- 💳 Day N: Recurring billing enabled, invoices on day N
- 💳 Off: Recurring billing disabled

## 6. Tooltips and Help Text

### Helpful Information Throughout

**Settings Page:**
- "Day of the month when recurring invoices are generated (1-28)"
- "Number of days from invoice date until payment is due"

**Services Page:**
- "Generate recurring invoices for active services"
- "Services that are due for billing will get invoiced"

**Service Form:**
- "Enable automatic recurring invoices for this service"
- "Use company default billing settings"
- "Day of month to generate invoices for this service"
- "Number of days until invoice payment is due"

## 7. Mobile Responsive Behavior

### Desktop (> 768px)
- Two-column layout for form fields
- Billing section spans full width
- Buttons aligned to right

### Tablet (768px - 1024px)
- Two-column layout maintained
- Slightly compressed spacing

### Mobile (< 768px)
- Single-column layout
- Full-width inputs
- Stacked buttons
- Billing section scrollable if needed

## 8. Color Scheme and Styling

### Current Theme Integration
The new UI elements use existing FireISP styles:

- **Primary Color**: Blue buttons (#2196f3)
- **Success**: Green badges for active status
- **Info**: Light blue backgrounds for info sections
- **Text**: Dark gray for primary, medium gray for secondary
- **Borders**: Light gray (#ddd)
- **Background**: White cards with subtle shadows

### New Section Styling
```css
.billing-configuration {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 4px;
  margin-top: 10px;
}

.billing-field-help {
  font-size: 12px;
  color: #666;
  margin-top: 5px;
}
```

## 9. Accessibility Features

✅ **Keyboard Navigation**
- All form fields reachable via Tab
- Logical tab order
- Enter submits forms

✅ **Screen Readers**
- Proper label associations
- Help text linked to inputs
- Button descriptions

✅ **Visual Indicators**
- Clear focus states
- Disabled state styling
- Error message display

✅ **Form Validation**
- Client-side validation
- Clear error messages
- Prevents invalid submissions

## 10. Browser Compatibility

Tested and working on:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

Uses standard HTML5 form controls and CSS3 features.

## Summary

The recurring invoice UI provides:
- **Intuitive**: Clear section headers and descriptions
- **Flexible**: Default settings with per-service overrides
- **Consistent**: Matches existing FireISP design patterns
- **Accessible**: Works for all users
- **Responsive**: Adapts to all screen sizes

Users can start using it immediately after setup with minimal training required.
