import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260722220337 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "product_review" ("id" text not null, "product_id" text not null, "customer_id" text null, "display_name" text not null default 'Verified Customer', "rating" integer not null, "title" text null, "content" text not null, "verified_purchase" boolean not null default false, "status" text not null default 'pending', "moderated_by" text null, "moderated_at" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_review_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_product_review_deleted_at" ON "product_review" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_product_review_product_id_status" ON "product_review" ("product_id", "status") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_product_review_status" ON "product_review" ("status") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_review" cascade;`)
  }
}
