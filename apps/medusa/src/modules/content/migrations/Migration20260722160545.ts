import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260722160545 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "content_site_setting" drop constraint if exists "content_site_setting_key_unique";`);
    this.addSql(`alter table if exists "content_page" drop constraint if exists "content_page_slug_locale_unique";`);
    this.addSql(`alter table if exists "content_article" drop constraint if exists "content_article_slug_locale_unique";`);
    this.addSql(`create table if not exists "content_article" ("id" text not null, "slug" text not null, "locale" text not null, "title" text not null, "excerpt" text null, "body" text not null, "hero_image" text null, "author_name" text null, "author_credentials" text null, "reviewer_name" text null, "reviewer_credentials" text null, "reviewed_at" text null, "category" text null, "seo_title" text null, "seo_description" text null, "status" text not null default 'draft', "published_at" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "content_article_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_content_article_deleted_at" ON "content_article" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_content_article_slug_locale_unique" ON "content_article" ("slug", "locale") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "content_page" ("id" text not null, "slug" text not null, "locale" text not null, "type" text not null default 'legal', "title" text not null, "body" text not null, "excerpt" text null, "seo_title" text null, "seo_description" text null, "status" text not null default 'published', "last_updated" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "content_page_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_content_page_deleted_at" ON "content_page" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_content_page_slug_locale_unique" ON "content_page" ("slug", "locale") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "content_site_setting" ("id" text not null, "key" text not null, "value" jsonb not null, "label" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "content_site_setting_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_content_site_setting_deleted_at" ON "content_site_setting" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_content_site_setting_key_unique" ON "content_site_setting" ("key") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "content_article" cascade;`);

    this.addSql(`drop table if exists "content_page" cascade;`);

    this.addSql(`drop table if exists "content_site_setting" cascade;`);
  }

}
