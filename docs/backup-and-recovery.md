# Backhaul Production PostgreSQL Backup & Disaster Recovery Guide

## 1. Overview
This document outlines the production backup, point-in-time recovery (PITR), disaster recovery, and database migration rollback procedures for the Backhaul transport platform.

## 2. Automated PostgreSQL Backup Strategy
- **Daily Full Backups:** Performed automatically at 02:00 UTC using `pg_dump` with custom compressed format (`.dump`).
- **WAL Archiving & PITR:** Write-Ahead Logs (WAL) continuously streamed to secure S3/GCS object storage allowing Point-In-Time Recovery (PITR) up to 14 days.
- **Retention Schedule:**
  - Daily dumps: Retained for 30 days.
  - Weekly dumps: Retained for 90 days.
  - Monthly archives: Retained for 1 year.

## 3. Disaster Recovery Execution Procedure
In the event of database corruption or hardware failover:
1. Provision a clean PostgreSQL 15+ database instance.
2. Restore the latest valid daily dump:
   ```bash
   pg_restore --clean --if-exists --no-owner --dbname=$DATABASE_URL backhaul_production_latest.dump
   ```
3. Replay WAL segments up to the target timestamp prior to corruption.
4. Execute `pnpm exec prisma migrate status` to verify migration consistency.

## 4. Database Migration Rollback Strategy
- Before applying any production migration (`prisma migrate deploy`), take an immediate snapshot:
  ```bash
  pg_dump --clean --if-exists -d $DATABASE_URL > pre_migration_backup.sql
  ```
- If a migration fails or causes application downtime, roll back by restoring `pre_migration_backup.sql` and redeploying the previous stable application build container.
