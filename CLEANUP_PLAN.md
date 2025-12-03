# FastLease Database Cleanup Plan

## Overview
This plan outlines the complete cleanup of all business data while preserving service users and system configuration.

## Current Database State Analysis

### Tables with Data to be Cleared:

#### Core Business Entities:
- **vehicles**: 2 records (Rolls-Royce Cullinan, Volvo XC40 Recharge)
- **deals**: 33 records (various lease agreements)
- **applications**: 0 records (currently empty)
- **investors**: 0 records (currently empty)

#### Supporting Data:
- **vehicle_images**: 1 record
- **vehicle_specifications**: 0 records
- **application_documents**: 0 records
- **deal_documents**: 195 records
- **client_documents**: 104 records
- **vehicle_documents**: 0 records

#### Financial Data:
- **invoices**: 0 records
- **payments**: 0 records
- **payment_transactions**: 0 records
- **payment_schedules**: 0 records

#### Support & Client Data:
- **support_tickets**: 0 records
- **support_messages**: 0 records
- **referral_codes**: 0 records
- **referral_events**: 0 records
- **referral_deals**: 0 records
- **referral_rewards**: 0 records
- **client_notifications**: 0 records

#### Workflow & Tasks:
- **tasks**: 61 records
- **workflow_task_queue**: 0 records
- **workflow_notification_queue**: 16 records
- **workflow_webhook_queue**: 8 records
- **workflow_schedule_queue**: 0 records

#### Investor Data:
- **investment_portfolios**: 0 records
- **portfolio_assets**: 0 records
- **portfolio_performance_snapshots**: 0 records
- **portfolio_activity_events**: 0 records
- **investor_reports**: 0 records

#### Audit & System Data:
- **audit_log**: 133 records
- **vehicle_services**: 0 records

#### System Configuration (to be preserved):
- **workflow_versions**: 19 records
- **workflow_task_templates**: 259 records
- **workflow_assets**: 27 records
- **deal_companies**: 0 records
- **role_access_rules**: 0 records

#### User Data (to be preserved):
- **profiles**: 49 records
- **user_roles**: 53 records
- **user_portals**: 64 records
- **auth_login_events**: 151 records
- **admin_portal_audit**: 3 records

## Cleanup Strategy

### Phase 1: Data Analysis & Backup
1. **Backup current state**: Create SQL dump of all tables before cleanup
2. **Verify foreign key constraints**: Ensure proper deletion order
3. **Count verification**: Double-check record counts

### Phase 2: Cleanup Execution Order
The cleanup must follow this specific order to respect foreign key constraints:

1. **Child tables first** (tables that reference other business tables):
   - `vehicle_services` (references vehicles, deals)
   - `portfolio_assets` (references portfolios, deals, vehicles)
   - `portfolio_performance_snapshots` (references portfolios)
   - `portfolio_activity_events` (references portfolios)
   - `investor_reports` (references portfolios)
   - `payment_transactions` (references payments)
   - `payments` (references invoices, deals)
   - `payment_schedules` (references deals)
   - `invoices` (references deals)
   - `deal_events` (references deals)
   - `support_messages` (references support_tickets)
   - `support_tickets` (references clients, deals)
   - `referral_rewards` (references referral_codes, deals)
   - `referral_deals` (references referral_codes, deals)
   - `referral_events` (references referral_codes)
   - `referral_codes` (references clients)
   - `client_notifications` (references clients)
   - `vehicle_specifications` (references vehicles)
   - `vehicle_images` (references vehicles)
   - `vehicle_documents` (references vehicles)
   - `application_documents` (references applications)
   - `deal_documents` (references deals)
   - `client_documents` (references clients)
   - `workflow_task_queue` (references deals)
   - `workflow_notification_queue` (references deals)
   - `workflow_webhook_queue` (references deals)
   - `workflow_schedule_queue` (references deals)
   - `task_reopen_events` (references tasks, deals)
   - `tasks` (references deals)
   - `audit_log` (references deals)

2. **Core business tables**:
   - `applications` (references users, vehicles)
   - `deals` (references applications, vehicles, clients)
   - `investment_portfolios` (references investors)
   - `investors` (references users)
   - `vehicles` (core vehicle data)

### Phase 3: Verification
1. **Count verification**: Confirm all target tables are empty
2. **System integrity check**: Verify preserved data remains intact
3. **Foreign key validation**: Ensure no orphaned references

## SQL Cleanup Script

```sql
-- Phase 1: Backup (recommended to run separately)
-- CREATE TABLE backup_vehicles AS SELECT * FROM vehicles;
-- CREATE TABLE backup_deals AS SELECT * FROM deals;
-- ... (repeat for all tables to be cleared)

-- Phase 2: Cleanup Execution
BEGIN;

-- 1. Clear child tables first
DELETE FROM vehicle_services;
DELETE FROM portfolio_assets;
DELETE FROM portfolio_performance_snapshots;
DELETE FROM portfolio_activity_events;
DELETE FROM investor_reports;
DELETE FROM payment_transactions;
DELETE FROM payments;
DELETE FROM payment_schedules;
DELETE FROM invoices;
DELETE FROM deal_events;
DELETE FROM support_messages;
DELETE FROM support_tickets;
DELETE FROM referral_rewards;
DELETE FROM referral_deals;
DELETE FROM referral_events;
DELETE FROM referral_codes;
DELETE FROM client_notifications;
DELETE FROM vehicle_specifications;
DELETE FROM vehicle_images;
DELETE FROM vehicle_documents;
DELETE FROM application_documents;
DELETE FROM deal_documents;
DELETE FROM client_documents;
DELETE FROM workflow_task_queue;
DELETE FROM workflow_notification_queue;
DELETE FROM workflow_webhook_queue;
DELETE FROM workflow_schedule_queue;
DELETE FROM task_reopen_events;
DELETE FROM tasks;
DELETE FROM audit_log;

-- 2. Clear core business tables
DELETE FROM applications;
DELETE FROM deals;
DELETE FROM investment_portfolios;
DELETE FROM investors;
DELETE FROM vehicles;

COMMIT;
```

## Expected Results

### Tables to be Emptied (0 records):
- vehicles, vehicle_images, vehicle_specifications, vehicle_documents, vehicle_services
- applications, application_documents
- deals, deal_documents, deal_events
- invoices, payments, payment_transactions, payment_schedules
- support_tickets, support_messages
- referral_codes, referral_events, referral_deals, referral_rewards
- client_notifications
- investors, investment_portfolios, portfolio_assets, portfolio_performance_snapshots, portfolio_activity_events, investor_reports
- tasks, workflow_task_queue, workflow_notification_queue, workflow_webhook_queue, workflow_schedule_queue, task_reopen_events
- audit_log

### Tables to be Preserved:
- **User data**: profiles (49), user_roles (53), user_portals (64), auth_login_events (151), admin_portal_audit (3)
- **System configuration**: workflow_versions (19), workflow_task_templates (259), workflow_assets (27), deal_companies (0), role_access_rules (0)
- **Backup/data export**: backup_csv_exports (2)

## Safety Measures

1. **Transaction safety**: Entire operation wrapped in BEGIN/COMMIT
2. **Foreign key respect**: Proper deletion order to avoid constraint violations
3. **Backup recommendation**: SQL comments show backup strategy
4. **Selective preservation**: Service users and system configuration untouched

## Execution Recommendation

1. **Review this plan** carefully before execution
2. **Consider running during low-traffic period**
3. **Have database backup** ready before execution
4. **Monitor system logs** during and after cleanup
5. **Verify application functionality** post-cleanup
