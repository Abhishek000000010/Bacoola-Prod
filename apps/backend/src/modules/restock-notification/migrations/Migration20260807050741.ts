import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260807050741 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "restock_subscription" ("id" text not null, "email" text not null, "variant_id" text not null, "variant_title" text null, "product_title" text null, "notified_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "restock_subscription_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_restock_subscription_deleted_at" ON "restock_subscription" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_restock_subscription_variant_id" ON "restock_subscription" ("variant_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_restock_subscription_email_variant_id" ON "restock_subscription" ("email", "variant_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "restock_subscription" cascade;`);
  }

}
