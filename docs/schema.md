# Database schema

Generated from the live Supabase Postgres database on 2026-09-07.

**145 tables · 1470 columns · 92 foreign keys · 8.4 MB on disk** (essentially empty - this is index scaffolding, not data).

Medusa 2.16's core schema plus five custom tables. Table-to-module membership is derived from each module package's own migration SQL, so the grouping is authoritative rather than inferred from name prefixes.

> **Medusa owns every table except the five marked _Custom_.** Do not add columns to them by hand - 30+ upstream migrations also touch them, and `db:migrate` never drops anything. Most core tables carry a `metadata` jsonb column for your own data.

> **PHI boundary.** Order line items name health products. `audit_log` and application logs deliberately store IDs only - see [privacy-boundary.md](./privacy-boundary.md) before copying order contents anywhere.

## Modules at a glance

| Module                                                |  Tables |       Size | Notes                                                                         |
| ----------------------------------------------------- | ------: | ---------: | ----------------------------------------------------------------------------- |
| [Order](#order)                                       |      23 |     1.3 MB | Sales records. Includes returns/claims/exchanges - one module, not separable. |
| [Link tables](#link-tables)                           |      20 |     1.5 MB | Auto-generated join tables connecting two modules. Not authored directly.     |
| [Product](#product)                                   |      13 |     736 kB | Catalog: products, variants, options, categories, tags.                       |
| [Fulfillment](#fulfillment)                           |      12 |     664 kB | Shipping options, profiles and fulfillment records.                           |
| [Promotion](#promotion)                               |      10 |     392 kB | Discount codes, powering the storefront `DiscountCode` component.             |
| [Cart](#cart)                                         |       9 |     536 kB | Pre-purchase state; becomes an order on completion.                           |
| [Payment](#payment)                                   |       9 |     424 kB | Bank transfer only (`pp_system_default`). No gateway tables.                  |
| [Auth](#auth)                                         |       6 |     240 kB | Identities, MFA factors and password-reset tokens.                            |
| [Pricing](#pricing)                                   |       6 |     424 kB | Price sets and rules behind every product price.                              |
| [Customer](#customer)                                 |       4 |     184 kB | Customer accounts, addresses and groups.                                      |
| [Framework](#framework)                               |       4 |     440 kB | Migration bookkeeping and workflow execution state.                           |
| [Tax](#tax)                                           |       4 |     240 kB | Tax regions and rates (one US region seeded).                                 |
| [Custom - content (CMS)](#custom---content-cms)       |       3 |      96 kB | Mini-CMS: policies, blog, site settings.                                      |
| [Inventory](#inventory)                               |       3 |     232 kB | Stock levels and reservations.                                                |
| [Settings](#settings)                                 |       3 |     128 kB | Admin view configuration and user preferences.                                |
| [Store](#store)                                       |       3 |     128 kB | Store record, supported currencies and locales.                               |
| [Notification](#notification)                         |       2 |     144 kB | Outbound notification log and providers.                                      |
| [Region](#region)                                     |       2 |     160 kB | Sales regions and their countries (US only).                                  |
| [Stock location](#stock-location)                     |       2 |      96 kB | Warehouses / stock locations.                                                 |
| [User](#user)                                         |       2 |      72 kB | Admin users and invites.                                                      |
| [API key](#api-key)                                   |       1 |     112 kB | Publishable and secret API keys.                                              |
| [Currency](#currency)                                 |       1 |      72 kB | Currency reference data.                                                      |
| [Custom - audit log](#custom---audit-log)             |       1 |      48 kB | Append-only HIPAA audit trail. IDs only - no PHI.                             |
| [Custom - product reviews](#custom---product-reviews) |       1 |      40 kB | Reviews with a mandatory moderation gate.                                     |
| [Sales channel](#sales-channel)                       |       1 |      48 kB | Sales channels.                                                               |
| **Total**                                             | **145** | **8.4 MB** |                                                                               |

## Legend

`PK` primary key · `→ table.col` foreign key · `NOT NULL` required. Types are shortened (`varchar`, `timestamptz`, `int`, `bool`, `jsonb`). Sizes include indexes.

## Order

Sales records. Includes returns/claims/exchanges - one module, not separable.

### `order`

<sub>20 columns · 192 kB</sub>

| Column                | Type        | Constraints          | Default                       |
| --------------------- | ----------- | -------------------- | ----------------------------- |
| `id`                  | text        | PK                   |                               |
| `region_id`           | text        |                      |                               |
| `display_id`          | int         |                      | `nextval('order_display_id_…` |
| `customer_id`         | text        |                      |                               |
| `version`             | int         | NOT NULL             | `1`                           |
| `sales_channel_id`    | text        |                      |                               |
| `status`              | enum        | NOT NULL             | `'pending'`                   |
| `is_draft_order`      | bool        | NOT NULL             | `false`                       |
| `email`               | text        |                      |                               |
| `currency_code`       | text        | NOT NULL             |                               |
| `shipping_address_id` | text        | → `order_address.id` |                               |
| `billing_address_id`  | text        | → `order_address.id` |                               |
| `no_notification`     | bool        |                      |                               |
| `metadata`            | jsonb       |                      |                               |
| `created_at`          | timestamptz | NOT NULL             | `now()`                       |
| `updated_at`          | timestamptz | NOT NULL             | `now()`                       |
| `deleted_at`          | timestamptz |                      |                               |
| `canceled_at`         | timestamptz |                      |                               |
| `custom_display_id`   | text        |                      |                               |
| `locale`              | text        |                      |                               |

### `order_address`

<sub>16 columns · 64 kB</sub>

| Column         | Type        | Constraints | Default |
| -------------- | ----------- | ----------- | ------- |
| `id`           | text        | PK          |         |
| `customer_id`  | text        |             |         |
| `company`      | text        |             |         |
| `first_name`   | text        |             |         |
| `last_name`    | text        |             |         |
| `address_1`    | text        |             |         |
| `address_2`    | text        |             |         |
| `city`         | text        |             |         |
| `country_code` | text        |             |         |
| `province`     | text        |             |         |
| `postal_code`  | text        |             |         |
| `phone`        | text        |             |         |
| `metadata`     | jsonb       |             |         |
| `created_at`   | timestamptz | NOT NULL    | `now()` |
| `updated_at`   | timestamptz | NOT NULL    | `now()` |
| `deleted_at`   | timestamptz |             |         |

### `order_change`

<sub>25 columns · 88 kB</sub>

| Column                  | Type        | Constraints           | Default     |
| ----------------------- | ----------- | --------------------- | ----------- |
| `id`                    | text        | PK                    |             |
| `order_id`              | text        | → `order.id` NOT NULL |             |
| `version`               | int         | NOT NULL              |             |
| `description`           | text        |                       |             |
| `status`                | text        | NOT NULL              | `'pending'` |
| `internal_note`         | text        |                       |             |
| `created_by`            | text        |                       |             |
| `requested_by`          | text        |                       |             |
| `requested_at`          | timestamptz |                       |             |
| `confirmed_by`          | text        |                       |             |
| `confirmed_at`          | timestamptz |                       |             |
| `declined_by`           | text        |                       |             |
| `declined_reason`       | text        |                       |             |
| `metadata`              | jsonb       |                       |             |
| `declined_at`           | timestamptz |                       |             |
| `canceled_by`           | text        |                       |             |
| `canceled_at`           | timestamptz |                       |             |
| `created_at`            | timestamptz | NOT NULL              | `now()`     |
| `updated_at`            | timestamptz | NOT NULL              | `now()`     |
| `change_type`           | text        |                       |             |
| `deleted_at`            | timestamptz |                       |             |
| `return_id`             | text        |                       |             |
| `claim_id`              | text        |                       |             |
| `exchange_id`           | text        |                       |             |
| `carry_over_promotions` | bool        |                       |             |

### `order_change_action`

<sub>19 columns · 72 kB</sub>

| Column            | Type        | Constraints         | Default                       |
| ----------------- | ----------- | ------------------- | ----------------------------- |
| `id`              | text        | PK                  |                               |
| `order_id`        | text        |                     |                               |
| `version`         | int         |                     |                               |
| `ordering`        | int8        | NOT NULL            | `nextval('order_change_acti…` |
| `order_change_id` | text        | → `order_change.id` |                               |
| `reference`       | text        |                     |                               |
| `reference_id`    | text        |                     |                               |
| `action`          | text        | NOT NULL            |                               |
| `details`         | jsonb       |                     |                               |
| `amount`          | numeric     |                     |                               |
| `raw_amount`      | jsonb       |                     |                               |
| `internal_note`   | text        |                     |                               |
| `applied`         | bool        | NOT NULL            | `false`                       |
| `created_at`      | timestamptz | NOT NULL            | `now()`                       |
| `updated_at`      | timestamptz | NOT NULL            | `now()`                       |
| `deleted_at`      | timestamptz |                     |                               |
| `return_id`       | text        |                     |                               |
| `claim_id`        | text        |                     |                               |
| `exchange_id`     | text        |                     |                               |

### `order_claim`

<sub>15 columns · 48 kB</sub>

| Column              | Type        | Constraints | Default                       |
| ------------------- | ----------- | ----------- | ----------------------------- |
| `id`                | text        | PK          |                               |
| `order_id`          | text        | NOT NULL    |                               |
| `return_id`         | text        |             |                               |
| `order_version`     | int         | NOT NULL    |                               |
| `display_id`        | int         | NOT NULL    | `nextval('order_claim_displ…` |
| `type`              | enum        | NOT NULL    |                               |
| `no_notification`   | bool        |             |                               |
| `refund_amount`     | numeric     |             |                               |
| `raw_refund_amount` | jsonb       |             |                               |
| `metadata`          | jsonb       |             |                               |
| `created_at`        | timestamptz | NOT NULL    | `now()`                       |
| `updated_at`        | timestamptz | NOT NULL    | `now()`                       |
| `deleted_at`        | timestamptz |             |                               |
| `canceled_at`       | timestamptz |             |                               |
| `created_by`        | text        |             |                               |

### `order_claim_item`

<sub>12 columns · 40 kB</sub>

| Column               | Type        | Constraints | Default |
| -------------------- | ----------- | ----------- | ------- |
| `id`                 | text        | PK          |         |
| `claim_id`           | text        | NOT NULL    |         |
| `item_id`            | text        | NOT NULL    |         |
| `is_additional_item` | bool        | NOT NULL    | `false` |
| `reason`             | enum        |             |         |
| `quantity`           | numeric     | NOT NULL    |         |
| `raw_quantity`       | jsonb       | NOT NULL    |         |
| `note`               | text        |             |         |
| `metadata`           | jsonb       |             |         |
| `created_at`         | timestamptz | NOT NULL    | `now()` |
| `updated_at`         | timestamptz | NOT NULL    | `now()` |
| `deleted_at`         | timestamptz |             |         |

### `order_claim_item_image`

<sub>7 columns · 32 kB</sub>

| Column          | Type        | Constraints | Default |
| --------------- | ----------- | ----------- | ------- |
| `id`            | text        | PK          |         |
| `claim_item_id` | text        | NOT NULL    |         |
| `url`           | text        | NOT NULL    |         |
| `metadata`      | jsonb       |             |         |
| `created_at`    | timestamptz | NOT NULL    | `now()` |
| `updated_at`    | timestamptz | NOT NULL    | `now()` |
| `deleted_at`    | timestamptz |             |         |

### `order_credit_line`

<sub>11 columns · 40 kB</sub>

| Column         | Type        | Constraints           | Default |
| -------------- | ----------- | --------------------- | ------- |
| `id`           | text        | PK                    |         |
| `order_id`     | text        | → `order.id` NOT NULL |         |
| `reference`    | text        |                       |         |
| `reference_id` | text        |                       |         |
| `amount`       | numeric     | NOT NULL              |         |
| `raw_amount`   | jsonb       | NOT NULL              |         |
| `metadata`     | jsonb       |                       |         |
| `created_at`   | timestamptz | NOT NULL              | `now()` |
| `updated_at`   | timestamptz | NOT NULL              | `now()` |
| `deleted_at`   | timestamptz |                       |         |
| `version`      | int         | NOT NULL              | `1`     |

### `order_exchange`

<sub>15 columns · 48 kB</sub>

| Column               | Type        | Constraints | Default                       |
| -------------------- | ----------- | ----------- | ----------------------------- |
| `id`                 | text        | PK          |                               |
| `order_id`           | text        | NOT NULL    |                               |
| `return_id`          | text        |             |                               |
| `order_version`      | int         | NOT NULL    |                               |
| `display_id`         | int         | NOT NULL    | `nextval('order_exchange_di…` |
| `no_notification`    | bool        |             |                               |
| `allow_backorder`    | bool        | NOT NULL    | `false`                       |
| `difference_due`     | numeric     |             |                               |
| `raw_difference_due` | jsonb       |             |                               |
| `metadata`           | jsonb       |             |                               |
| `created_at`         | timestamptz | NOT NULL    | `now()`                       |
| `updated_at`         | timestamptz | NOT NULL    | `now()`                       |
| `deleted_at`         | timestamptz |             |                               |
| `canceled_at`        | timestamptz |             |                               |
| `created_by`         | text        |             |                               |

### `order_exchange_item`

<sub>10 columns · 40 kB</sub>

| Column         | Type        | Constraints | Default |
| -------------- | ----------- | ----------- | ------- |
| `id`           | text        | PK          |         |
| `exchange_id`  | text        | NOT NULL    |         |
| `item_id`      | text        | NOT NULL    |         |
| `quantity`     | numeric     | NOT NULL    |         |
| `raw_quantity` | jsonb       | NOT NULL    |         |
| `note`         | text        |             |         |
| `metadata`     | jsonb       |             |         |
| `created_at`   | timestamptz | NOT NULL    | `now()` |
| `updated_at`   | timestamptz | NOT NULL    | `now()` |
| `deleted_at`   | timestamptz |             |         |

### `order_item`

<sub>28 columns · 88 kB</sub>

| Column                          | Type        | Constraints                     | Default                       |
| ------------------------------- | ----------- | ------------------------------- | ----------------------------- |
| `id`                            | text        | PK                              |                               |
| `order_id`                      | text        | → `order.id` NOT NULL           |                               |
| `version`                       | int         | NOT NULL                        |                               |
| `item_id`                       | text        | → `order_line_item.id` NOT NULL |                               |
| `quantity`                      | numeric     | NOT NULL                        |                               |
| `raw_quantity`                  | jsonb       | NOT NULL                        |                               |
| `fulfilled_quantity`            | numeric     | NOT NULL                        |                               |
| `raw_fulfilled_quantity`        | jsonb       | NOT NULL                        | `'{"value": "0", "precision…` |
| `shipped_quantity`              | numeric     | NOT NULL                        |                               |
| `raw_shipped_quantity`          | jsonb       | NOT NULL                        | `'{"value": "0", "precision…` |
| `return_requested_quantity`     | numeric     | NOT NULL                        |                               |
| `raw_return_requested_quantity` | jsonb       | NOT NULL                        | `'{"value": "0", "precision…` |
| `return_received_quantity`      | numeric     | NOT NULL                        |                               |
| `raw_return_received_quantity`  | jsonb       | NOT NULL                        | `'{"value": "0", "precision…` |
| `return_dismissed_quantity`     | numeric     | NOT NULL                        |                               |
| `raw_return_dismissed_quantity` | jsonb       | NOT NULL                        | `'{"value": "0", "precision…` |
| `written_off_quantity`          | numeric     | NOT NULL                        |                               |
| `raw_written_off_quantity`      | jsonb       | NOT NULL                        | `'{"value": "0", "precision…` |
| `metadata`                      | jsonb       |                                 |                               |
| `created_at`                    | timestamptz | NOT NULL                        | `now()`                       |
| `updated_at`                    | timestamptz | NOT NULL                        | `now()`                       |
| `deleted_at`                    | timestamptz |                                 |                               |
| `delivered_quantity`            | numeric     | NOT NULL                        | `0`                           |
| `raw_delivered_quantity`        | jsonb       | NOT NULL                        | `'{"value": "0", "precision…` |
| `unit_price`                    | numeric     |                                 |                               |
| `raw_unit_price`                | jsonb       |                                 |                               |
| `compare_at_unit_price`         | numeric     |                                 |                               |
| `raw_compare_at_unit_price`     | jsonb       |                                 |                               |

### `order_line_item`

<sub>31 columns · 72 kB</sub>

| Column                      | Type        | Constraints       | Default |
| --------------------------- | ----------- | ----------------- | ------- |
| `id`                        | text        | PK                |         |
| `totals_id`                 | text        | → `order_item.id` |         |
| `title`                     | text        | NOT NULL          |         |
| `subtitle`                  | text        |                   |         |
| `thumbnail`                 | text        |                   |         |
| `variant_id`                | text        |                   |         |
| `product_id`                | text        |                   |         |
| `product_title`             | text        |                   |         |
| `product_description`       | text        |                   |         |
| `product_subtitle`          | text        |                   |         |
| `product_type`              | text        |                   |         |
| `product_collection`        | text        |                   |         |
| `product_handle`            | text        |                   |         |
| `variant_sku`               | text        |                   |         |
| `variant_barcode`           | text        |                   |         |
| `variant_title`             | text        |                   |         |
| `variant_option_values`     | jsonb       |                   |         |
| `requires_shipping`         | bool        | NOT NULL          | `true`  |
| `is_discountable`           | bool        | NOT NULL          | `true`  |
| `is_tax_inclusive`          | bool        | NOT NULL          | `false` |
| `compare_at_unit_price`     | numeric     |                   |         |
| `raw_compare_at_unit_price` | jsonb       |                   |         |
| `unit_price`                | numeric     | NOT NULL          |         |
| `raw_unit_price`            | jsonb       | NOT NULL          |         |
| `metadata`                  | jsonb       |                   |         |
| `created_at`                | timestamptz | NOT NULL          | `now()` |
| `updated_at`                | timestamptz | NOT NULL          | `now()` |
| `deleted_at`                | timestamptz |                   |         |
| `is_custom_price`           | bool        | NOT NULL          | `false` |
| `product_type_id`           | text        |                   |         |
| `is_giftcard`               | bool        | NOT NULL          | `false` |

### `order_line_item_adjustment`

<sub>13 columns · 24 kB</sub>

| Column             | Type        | Constraints                     | Default |
| ------------------ | ----------- | ------------------------------- | ------- |
| `id`               | text        | PK                              |         |
| `description`      | text        |                                 |         |
| `promotion_id`     | text        |                                 |         |
| `code`             | text        |                                 |         |
| `amount`           | numeric     | NOT NULL                        |         |
| `raw_amount`       | jsonb       | NOT NULL                        |         |
| `provider_id`      | text        |                                 |         |
| `created_at`       | timestamptz | NOT NULL                        | `now()` |
| `updated_at`       | timestamptz | NOT NULL                        | `now()` |
| `item_id`          | text        | → `order_line_item.id` NOT NULL |         |
| `deleted_at`       | timestamptz |                                 |         |
| `is_tax_inclusive` | bool        | NOT NULL                        | `false` |
| `version`          | int         | NOT NULL                        | `1`     |

### `order_line_item_tax_line`

<sub>11 columns · 24 kB</sub>

| Column        | Type        | Constraints                     | Default |
| ------------- | ----------- | ------------------------------- | ------- |
| `id`          | text        | PK                              |         |
| `description` | text        |                                 |         |
| `tax_rate_id` | text        |                                 |         |
| `code`        | text        | NOT NULL                        |         |
| `rate`        | numeric     | NOT NULL                        |         |
| `raw_rate`    | jsonb       | NOT NULL                        |         |
| `provider_id` | text        |                                 |         |
| `created_at`  | timestamptz | NOT NULL                        | `now()` |
| `updated_at`  | timestamptz | NOT NULL                        | `now()` |
| `item_id`     | text        | → `order_line_item.id` NOT NULL |         |
| `deleted_at`  | timestamptz |                                 |         |

### `order_shipping`

<sub>10 columns · 128 kB</sub>

| Column               | Type        | Constraints           | Default |
| -------------------- | ----------- | --------------------- | ------- |
| `id`                 | text        | PK                    |         |
| `order_id`           | text        | → `order.id` NOT NULL |         |
| `version`            | int         | NOT NULL              |         |
| `shipping_method_id` | text        | NOT NULL              |         |
| `created_at`         | timestamptz | NOT NULL              | `now()` |
| `updated_at`         | timestamptz | NOT NULL              | `now()` |
| `deleted_at`         | timestamptz |                       |         |
| `return_id`          | text        |                       |         |
| `claim_id`           | text        |                       |         |
| `exchange_id`        | text        |                       |         |

### `order_shipping_method`

<sub>13 columns · 48 kB</sub>

| Column               | Type        | Constraints | Default |
| -------------------- | ----------- | ----------- | ------- |
| `id`                 | text        | PK          |         |
| `name`               | text        | NOT NULL    |         |
| `description`        | jsonb       |             |         |
| `amount`             | numeric     | NOT NULL    |         |
| `raw_amount`         | jsonb       | NOT NULL    |         |
| `is_tax_inclusive`   | bool        | NOT NULL    | `false` |
| `shipping_option_id` | text        |             |         |
| `data`               | jsonb       |             |         |
| `metadata`           | jsonb       |             |         |
| `created_at`         | timestamptz | NOT NULL    | `now()` |
| `updated_at`         | timestamptz | NOT NULL    | `now()` |
| `deleted_at`         | timestamptz |             |         |
| `is_custom_amount`   | bool        | NOT NULL    | `false` |

### `order_shipping_method_adjustment`

<sub>12 columns · 32 kB</sub>

| Column               | Type        | Constraints                           | Default |
| -------------------- | ----------- | ------------------------------------- | ------- |
| `id`                 | text        | PK                                    |         |
| `description`        | text        |                                       |         |
| `promotion_id`       | text        |                                       |         |
| `code`               | text        |                                       |         |
| `amount`             | numeric     | NOT NULL                              |         |
| `raw_amount`         | jsonb       | NOT NULL                              |         |
| `provider_id`        | text        |                                       |         |
| `created_at`         | timestamptz | NOT NULL                              | `now()` |
| `updated_at`         | timestamptz | NOT NULL                              | `now()` |
| `shipping_method_id` | text        | → `order_shipping_method.id` NOT NULL |         |
| `deleted_at`         | timestamptz |                                       |         |
| `version`            | int         | NOT NULL                              | `1`     |

### `order_shipping_method_tax_line`

<sub>11 columns · 24 kB</sub>

| Column               | Type        | Constraints                           | Default |
| -------------------- | ----------- | ------------------------------------- | ------- |
| `id`                 | text        | PK                                    |         |
| `description`        | text        |                                       |         |
| `tax_rate_id`        | text        |                                       |         |
| `code`               | text        | NOT NULL                              |         |
| `rate`               | numeric     | NOT NULL                              |         |
| `raw_rate`           | jsonb       | NOT NULL                              |         |
| `provider_id`        | text        |                                       |         |
| `created_at`         | timestamptz | NOT NULL                              | `now()` |
| `updated_at`         | timestamptz | NOT NULL                              | `now()` |
| `shipping_method_id` | text        | → `order_shipping_method.id` NOT NULL |         |
| `deleted_at`         | timestamptz |                                       |         |

### `order_summary`

<sub>7 columns · 56 kB</sub>

| Column       | Type        | Constraints           | Default |
| ------------ | ----------- | --------------------- | ------- |
| `id`         | text        | PK                    |         |
| `order_id`   | text        | → `order.id` NOT NULL |         |
| `version`    | int         | NOT NULL              | `1`     |
| `totals`     | jsonb       |                       |         |
| `created_at` | timestamptz | NOT NULL              | `now()` |
| `updated_at` | timestamptz | NOT NULL              | `now()` |
| `deleted_at` | timestamptz |                       |         |

### `order_transaction`

<sub>14 columns · 72 kB</sub>

| Column          | Type        | Constraints           | Default |
| --------------- | ----------- | --------------------- | ------- |
| `id`            | text        | PK                    |         |
| `order_id`      | text        | → `order.id` NOT NULL |         |
| `version`       | int         | NOT NULL              | `1`     |
| `amount`        | numeric     | NOT NULL              |         |
| `raw_amount`    | jsonb       | NOT NULL              |         |
| `currency_code` | text        | NOT NULL              |         |
| `reference`     | text        |                       |         |
| `reference_id`  | text        |                       |         |
| `created_at`    | timestamptz | NOT NULL              | `now()` |
| `updated_at`    | timestamptz | NOT NULL              | `now()` |
| `deleted_at`    | timestamptz |                       |         |
| `return_id`     | text        |                       |         |
| `claim_id`      | text        |                       |         |
| `exchange_id`   | text        |                       |         |

### `return`

<sub>19 columns · 48 kB</sub>

| Column              | Type        | Constraints | Default                       |
| ------------------- | ----------- | ----------- | ----------------------------- |
| `id`                | text        | PK          |                               |
| `order_id`          | text        | NOT NULL    |                               |
| `claim_id`          | text        |             |                               |
| `exchange_id`       | text        |             |                               |
| `order_version`     | int         | NOT NULL    |                               |
| `display_id`        | int         | NOT NULL    | `nextval('return_display_id…` |
| `status`            | enum        | NOT NULL    | `'open'`                      |
| `no_notification`   | bool        |             |                               |
| `refund_amount`     | numeric     |             |                               |
| `raw_refund_amount` | jsonb       |             |                               |
| `metadata`          | jsonb       |             |                               |
| `created_at`        | timestamptz | NOT NULL    | `now()`                       |
| `updated_at`        | timestamptz | NOT NULL    | `now()`                       |
| `deleted_at`        | timestamptz |             |                               |
| `received_at`       | timestamptz |             |                               |
| `canceled_at`       | timestamptz |             |                               |
| `location_id`       | text        |             |                               |
| `requested_at`      | timestamptz |             |                               |
| `created_by`        | text        |             |                               |

### `return_item`

<sub>15 columns · 48 kB</sub>

| Column                  | Type        | Constraints | Default                       |
| ----------------------- | ----------- | ----------- | ----------------------------- |
| `id`                    | text        | PK          |                               |
| `return_id`             | text        | NOT NULL    |                               |
| `reason_id`             | text        |             |                               |
| `item_id`               | text        | NOT NULL    |                               |
| `quantity`              | numeric     | NOT NULL    |                               |
| `raw_quantity`          | jsonb       | NOT NULL    |                               |
| `received_quantity`     | numeric     | NOT NULL    | `0`                           |
| `raw_received_quantity` | jsonb       | NOT NULL    | `'{"value": "0", "precision…` |
| `note`                  | text        |             |                               |
| `metadata`              | jsonb       |             |                               |
| `created_at`            | timestamptz | NOT NULL    | `now()`                       |
| `updated_at`            | timestamptz | NOT NULL    | `now()`                       |
| `deleted_at`            | timestamptz |             |                               |
| `damaged_quantity`      | numeric     | NOT NULL    | `0`                           |
| `raw_damaged_quantity`  | jsonb       | NOT NULL    | `'{"value": "0", "precision…` |

### `return_reason`

<sub>9 columns · 32 kB</sub>

| Column                    | Type        | Constraints          | Default |
| ------------------------- | ----------- | -------------------- | ------- |
| `id`                      | varchar     | PK                   |         |
| `value`                   | varchar     | NOT NULL             |         |
| `label`                   | varchar     | NOT NULL             |         |
| `description`             | varchar     |                      |         |
| `metadata`                | jsonb       |                      |         |
| `parent_return_reason_id` | varchar     | → `return_reason.id` |         |
| `created_at`              | timestamptz | NOT NULL             | `now()` |
| `updated_at`              | timestamptz | NOT NULL             | `now()` |
| `deleted_at`              | timestamptz |                      |         |

## Link tables

Auto-generated join tables connecting two modules. Not authored directly.

### `cart_payment_collection`

<sub>6 columns · 96 kB</sub>

| Column                  | Type        | Constraints | Default             |
| ----------------------- | ----------- | ----------- | ------------------- |
| `cart_id`               | varchar     | PK          |                     |
| `payment_collection_id` | varchar     | PK          |                     |
| `id`                    | varchar     | NOT NULL    |                     |
| `created_at`            | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `updated_at`            | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `deleted_at`            | timestamptz |             |                     |

### `cart_promotion`

<sub>6 columns · 48 kB</sub>

| Column         | Type        | Constraints | Default             |
| -------------- | ----------- | ----------- | ------------------- |
| `cart_id`      | varchar     | PK          |                     |
| `promotion_id` | varchar     | PK          |                     |
| `id`           | varchar     | NOT NULL    |                     |
| `created_at`   | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `updated_at`   | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `deleted_at`   | timestamptz |             |                     |

### `customer_account_holder`

<sub>6 columns · 48 kB</sub>

| Column              | Type        | Constraints | Default             |
| ------------------- | ----------- | ----------- | ------------------- |
| `customer_id`       | varchar     | PK          |                     |
| `account_holder_id` | varchar     | PK          |                     |
| `id`                | varchar     | NOT NULL    |                     |
| `created_at`        | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `updated_at`        | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `deleted_at`        | timestamptz |             |                     |

### `invite_rbac_role`

<sub>6 columns · 48 kB</sub>

| Column         | Type        | Constraints | Default             |
| -------------- | ----------- | ----------- | ------------------- |
| `invite_id`    | varchar     | PK          |                     |
| `rbac_role_id` | varchar     | PK          |                     |
| `id`           | varchar     | NOT NULL    |                     |
| `created_at`   | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `updated_at`   | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `deleted_at`   | timestamptz |             |                     |

### `location_fulfillment_provider`

<sub>6 columns · 96 kB</sub>

| Column                    | Type        | Constraints | Default             |
| ------------------------- | ----------- | ----------- | ------------------- |
| `stock_location_id`       | varchar     | PK          |                     |
| `fulfillment_provider_id` | varchar     | PK          |                     |
| `id`                      | varchar     | NOT NULL    |                     |
| `created_at`              | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `updated_at`              | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `deleted_at`              | timestamptz |             |                     |

### `location_fulfillment_set`

<sub>6 columns · 96 kB</sub>

| Column               | Type        | Constraints | Default             |
| -------------------- | ----------- | ----------- | ------------------- |
| `stock_location_id`  | varchar     | PK          |                     |
| `fulfillment_set_id` | varchar     | PK          |                     |
| `id`                 | varchar     | NOT NULL    |                     |
| `created_at`         | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `updated_at`         | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `deleted_at`         | timestamptz |             |                     |

### `order_cart`

<sub>6 columns · 96 kB</sub>

| Column       | Type        | Constraints | Default             |
| ------------ | ----------- | ----------- | ------------------- |
| `order_id`   | varchar     | PK          |                     |
| `cart_id`    | varchar     | PK          |                     |
| `id`         | varchar     | NOT NULL    |                     |
| `created_at` | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `updated_at` | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `deleted_at` | timestamptz |             |                     |

### `order_fulfillment`

<sub>6 columns · 48 kB</sub>

| Column           | Type        | Constraints | Default             |
| ---------------- | ----------- | ----------- | ------------------- |
| `order_id`       | varchar     | PK          |                     |
| `fulfillment_id` | varchar     | PK          |                     |
| `id`             | varchar     | NOT NULL    |                     |
| `created_at`     | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `updated_at`     | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `deleted_at`     | timestamptz |             |                     |

### `order_payment_collection`

<sub>6 columns · 96 kB</sub>

| Column                  | Type        | Constraints | Default             |
| ----------------------- | ----------- | ----------- | ------------------- |
| `order_id`              | varchar     | PK          |                     |
| `payment_collection_id` | varchar     | PK          |                     |
| `id`                    | varchar     | NOT NULL    |                     |
| `created_at`            | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `updated_at`            | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `deleted_at`            | timestamptz |             |                     |

### `order_promotion`

<sub>6 columns · 48 kB</sub>

| Column         | Type        | Constraints | Default             |
| -------------- | ----------- | ----------- | ------------------- |
| `order_id`     | varchar     | PK          |                     |
| `promotion_id` | varchar     | PK          |                     |
| `id`           | varchar     | NOT NULL    |                     |
| `created_at`   | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `updated_at`   | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `deleted_at`   | timestamptz |             |                     |

### `product_sales_channel`

<sub>6 columns · 96 kB</sub>

| Column             | Type        | Constraints | Default             |
| ------------------ | ----------- | ----------- | ------------------- |
| `product_id`       | varchar     | PK          |                     |
| `sales_channel_id` | varchar     | PK          |                     |
| `id`               | varchar     | NOT NULL    |                     |
| `created_at`       | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `updated_at`       | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `deleted_at`       | timestamptz |             |                     |

### `product_shipping_profile`

<sub>6 columns · 96 kB</sub>

| Column                | Type        | Constraints | Default             |
| --------------------- | ----------- | ----------- | ------------------- |
| `product_id`          | varchar     | PK          |                     |
| `shipping_profile_id` | varchar     | PK          |                     |
| `id`                  | varchar     | NOT NULL    |                     |
| `created_at`          | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `updated_at`          | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `deleted_at`          | timestamptz |             |                     |

### `product_variant_inventory_item`

<sub>7 columns · 96 kB</sub>

| Column              | Type        | Constraints | Default             |
| ------------------- | ----------- | ----------- | ------------------- |
| `variant_id`        | varchar     | PK          |                     |
| `inventory_item_id` | varchar     | PK          |                     |
| `id`                | varchar     | NOT NULL    |                     |
| `required_quantity` | int         | NOT NULL    | `1`                 |
| `created_at`        | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `updated_at`        | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `deleted_at`        | timestamptz |             |                     |

### `product_variant_price_set`

<sub>6 columns · 96 kB</sub>

| Column         | Type        | Constraints | Default             |
| -------------- | ----------- | ----------- | ------------------- |
| `variant_id`   | varchar     | PK          |                     |
| `price_set_id` | varchar     | PK          |                     |
| `id`           | varchar     | NOT NULL    |                     |
| `created_at`   | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `updated_at`   | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `deleted_at`   | timestamptz |             |                     |

### `publishable_api_key_sales_channel`

<sub>6 columns · 96 kB</sub>

| Column               | Type        | Constraints | Default             |
| -------------------- | ----------- | ----------- | ------------------- |
| `publishable_key_id` | varchar     | PK          |                     |
| `sales_channel_id`   | varchar     | PK          |                     |
| `id`                 | varchar     | NOT NULL    |                     |
| `created_at`         | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `updated_at`         | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `deleted_at`         | timestamptz |             |                     |

### `region_payment_provider`

<sub>6 columns · 96 kB</sub>

| Column                | Type        | Constraints | Default             |
| --------------------- | ----------- | ----------- | ------------------- |
| `region_id`           | varchar     | PK          |                     |
| `payment_provider_id` | varchar     | PK          |                     |
| `id`                  | varchar     | NOT NULL    |                     |
| `created_at`          | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `updated_at`          | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `deleted_at`          | timestamptz |             |                     |

### `return_fulfillment`

<sub>6 columns · 48 kB</sub>

| Column           | Type        | Constraints | Default             |
| ---------------- | ----------- | ----------- | ------------------- |
| `return_id`      | varchar     | PK          |                     |
| `fulfillment_id` | varchar     | PK          |                     |
| `id`             | varchar     | NOT NULL    |                     |
| `created_at`     | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `updated_at`     | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `deleted_at`     | timestamptz |             |                     |

### `sales_channel_stock_location`

<sub>6 columns · 96 kB</sub>

| Column              | Type        | Constraints | Default             |
| ------------------- | ----------- | ----------- | ------------------- |
| `sales_channel_id`  | varchar     | PK          |                     |
| `stock_location_id` | varchar     | PK          |                     |
| `id`                | varchar     | NOT NULL    |                     |
| `created_at`        | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `updated_at`        | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `deleted_at`        | timestamptz |             |                     |

### `shipping_option_price_set`

<sub>6 columns · 96 kB</sub>

| Column               | Type        | Constraints | Default             |
| -------------------- | ----------- | ----------- | ------------------- |
| `shipping_option_id` | varchar     | PK          |                     |
| `price_set_id`       | varchar     | PK          |                     |
| `id`                 | varchar     | NOT NULL    |                     |
| `created_at`         | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `updated_at`         | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `deleted_at`         | timestamptz |             |                     |

### `user_rbac_role`

<sub>6 columns · 48 kB</sub>

| Column         | Type        | Constraints | Default             |
| -------------- | ----------- | ----------- | ------------------- |
| `user_id`      | varchar     | PK          |                     |
| `rbac_role_id` | varchar     | PK          |                     |
| `id`           | varchar     | NOT NULL    |                     |
| `created_at`   | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `updated_at`   | timestamptz | NOT NULL    | `CURRENT_TIMESTAMP` |
| `deleted_at`   | timestamptz |             |                     |

## Product

Catalog: products, variants, options, categories, tags.

### `image`

<sub>8 columns · 64 kB</sub>

| Column       | Type        | Constraints             | Default |
| ------------ | ----------- | ----------------------- | ------- |
| `id`         | text        | PK                      |         |
| `url`        | text        | NOT NULL                |         |
| `metadata`   | jsonb       |                         |         |
| `created_at` | timestamptz | NOT NULL                | `now()` |
| `updated_at` | timestamptz | NOT NULL                | `now()` |
| `deleted_at` | timestamptz |                         |         |
| `rank`       | int         | NOT NULL                | `0`     |
| `product_id` | text        | → `product.id` NOT NULL |         |

### `product`

<sub>24 columns · 128 kB</sub>

| Column           | Type        | Constraints               | Default   |
| ---------------- | ----------- | ------------------------- | --------- |
| `id`             | text        | PK                        |           |
| `title`          | text        | NOT NULL                  |           |
| `handle`         | text        | NOT NULL                  |           |
| `subtitle`       | text        |                           |           |
| `description`    | text        |                           |           |
| `is_giftcard`    | bool        | NOT NULL                  | `false`   |
| `status`         | text        | NOT NULL                  | `'draft'` |
| `thumbnail`      | text        |                           |           |
| `weight`         | float4      |                           |           |
| `length`         | float4      |                           |           |
| `height`         | float4      |                           |           |
| `width`          | float4      |                           |           |
| `origin_country` | text        |                           |           |
| `hs_code`        | text        |                           |           |
| `mid_code`       | text        |                           |           |
| `material`       | text        |                           |           |
| `collection_id`  | text        | → `product_collection.id` |           |
| `type_id`        | text        | → `product_type.id`       |           |
| `discountable`   | bool        | NOT NULL                  | `true`    |
| `external_id`    | text        |                           |           |
| `created_at`     | timestamptz | NOT NULL                  | `now()`   |
| `updated_at`     | timestamptz | NOT NULL                  | `now()`   |
| `deleted_at`     | timestamptz |                           |           |
| `metadata`       | jsonb       |                           |           |

### `product_category`

<sub>14 columns · 40 kB</sub>

| Column               | Type        | Constraints             | Default |
| -------------------- | ----------- | ----------------------- | ------- |
| `id`                 | text        | PK                      |         |
| `name`               | text        | NOT NULL                |         |
| `description`        | text        | NOT NULL                | `''`    |
| `handle`             | text        | NOT NULL                |         |
| `mpath`              | text        | NOT NULL                |         |
| `is_active`          | bool        | NOT NULL                | `false` |
| `is_internal`        | bool        | NOT NULL                | `false` |
| `rank`               | int         | NOT NULL                | `0`     |
| `parent_category_id` | text        | → `product_category.id` |         |
| `created_at`         | timestamptz | NOT NULL                | `now()` |
| `updated_at`         | timestamptz | NOT NULL                | `now()` |
| `deleted_at`         | timestamptz |                         |         |
| `metadata`           | jsonb       |                         |         |
| `external_id`        | text        |                         |         |

### `product_category_product`

<sub>2 columns · 16 kB</sub>

| Column                | Type | Constraints                | Default |
| --------------------- | ---- | -------------------------- | ------- |
| `product_id`          | text | PK → `product.id`          |         |
| `product_category_id` | text | PK → `product_category.id` |         |

### `product_collection`

<sub>8 columns · 32 kB</sub>

| Column        | Type        | Constraints | Default |
| ------------- | ----------- | ----------- | ------- |
| `id`          | text        | PK          |         |
| `title`       | text        | NOT NULL    |         |
| `handle`      | text        | NOT NULL    |         |
| `metadata`    | jsonb       |             |         |
| `created_at`  | timestamptz | NOT NULL    | `now()` |
| `updated_at`  | timestamptz | NOT NULL    | `now()` |
| `deleted_at`  | timestamptz |             |         |
| `external_id` | text        |             |         |

### `product_option`

<sub>7 columns · 80 kB</sub>

| Column       | Type        | Constraints             | Default |
| ------------ | ----------- | ----------------------- | ------- |
| `id`         | text        | PK                      |         |
| `title`      | text        | NOT NULL                |         |
| `product_id` | text        | → `product.id` NOT NULL |         |
| `metadata`   | jsonb       |                         |         |
| `created_at` | timestamptz | NOT NULL                | `now()` |
| `updated_at` | timestamptz | NOT NULL                | `now()` |
| `deleted_at` | timestamptz |                         |         |

### `product_option_value`

<sub>7 columns · 80 kB</sub>

| Column       | Type        | Constraints           | Default |
| ------------ | ----------- | --------------------- | ------- |
| `id`         | text        | PK                    |         |
| `value`      | text        | NOT NULL              |         |
| `option_id`  | text        | → `product_option.id` |         |
| `metadata`   | jsonb       |                       |         |
| `created_at` | timestamptz | NOT NULL              | `now()` |
| `updated_at` | timestamptz | NOT NULL              | `now()` |
| `deleted_at` | timestamptz |                       |         |

### `product_tag`

<sub>7 columns · 32 kB</sub>

| Column        | Type        | Constraints | Default |
| ------------- | ----------- | ----------- | ------- |
| `id`          | text        | PK          |         |
| `value`       | text        | NOT NULL    |         |
| `metadata`    | jsonb       |             |         |
| `created_at`  | timestamptz | NOT NULL    | `now()` |
| `updated_at`  | timestamptz | NOT NULL    | `now()` |
| `deleted_at`  | timestamptz |             |         |
| `external_id` | text        |             |         |

### `product_tags`

<sub>2 columns · 16 kB</sub>

| Column           | Type | Constraints           | Default |
| ---------------- | ---- | --------------------- | ------- |
| `product_id`     | text | PK → `product.id`     |         |
| `product_tag_id` | text | PK → `product_tag.id` |         |

### `product_type`

<sub>7 columns · 32 kB</sub>

| Column        | Type        | Constraints | Default |
| ------------- | ----------- | ----------- | ------- |
| `id`          | text        | PK          |         |
| `value`       | text        | NOT NULL    |         |
| `metadata`    | json        |             |         |
| `created_at`  | timestamptz | NOT NULL    | `now()` |
| `updated_at`  | timestamptz | NOT NULL    | `now()` |
| `deleted_at`  | timestamptz |             |         |
| `external_id` | text        |             |         |

### `product_variant`

<sub>23 columns · 144 kB</sub>

| Column             | Type        | Constraints    | Default |
| ------------------ | ----------- | -------------- | ------- |
| `id`               | text        | PK             |         |
| `title`            | text        | NOT NULL       |         |
| `sku`              | text        |                |         |
| `barcode`          | text        |                |         |
| `ean`              | text        |                |         |
| `upc`              | text        |                |         |
| `allow_backorder`  | bool        | NOT NULL       | `false` |
| `manage_inventory` | bool        | NOT NULL       | `true`  |
| `hs_code`          | text        |                |         |
| `origin_country`   | text        |                |         |
| `mid_code`         | text        |                |         |
| `material`         | text        |                |         |
| `weight`           | float4      |                |         |
| `length`           | float4      |                |         |
| `height`           | float4      |                |         |
| `width`            | float4      |                |         |
| `metadata`         | jsonb       |                |         |
| `variant_rank`     | int         |                | `0`     |
| `product_id`       | text        | → `product.id` |         |
| `created_at`       | timestamptz | NOT NULL       | `now()` |
| `updated_at`       | timestamptz | NOT NULL       | `now()` |
| `deleted_at`       | timestamptz |                |         |
| `thumbnail`        | text        |                |         |

### `product_variant_option`

<sub>2 columns · 32 kB</sub>

| Column            | Type | Constraints                    | Default |
| ----------------- | ---- | ------------------------------ | ------- |
| `variant_id`      | text | PK → `product_variant.id`      |         |
| `option_value_id` | text | PK → `product_option_value.id` |         |

### `product_variant_product_image`

<sub>6 columns · 40 kB</sub>

| Column       | Type        | Constraints           | Default |
| ------------ | ----------- | --------------------- | ------- |
| `id`         | text        | PK                    |         |
| `variant_id` | text        | NOT NULL              |         |
| `image_id`   | text        | → `image.id` NOT NULL |         |
| `created_at` | timestamptz | NOT NULL              | `now()` |
| `updated_at` | timestamptz | NOT NULL              | `now()` |
| `deleted_at` | timestamptz |                       |         |

## Fulfillment

Shipping options, profiles and fulfillment records.

### `fulfillment`

<sub>17 columns · 40 kB</sub>

| Column                | Type        | Constraints                 | Default |
| --------------------- | ----------- | --------------------------- | ------- |
| `id`                  | text        | PK                          |         |
| `location_id`         | text        | NOT NULL                    |         |
| `packed_at`           | timestamptz |                             |         |
| `shipped_at`          | timestamptz |                             |         |
| `delivered_at`        | timestamptz |                             |         |
| `canceled_at`         | timestamptz |                             |         |
| `data`                | jsonb       |                             |         |
| `provider_id`         | text        | → `fulfillment_provider.id` |         |
| `shipping_option_id`  | text        | → `shipping_option.id`      |         |
| `metadata`            | jsonb       |                             |         |
| `delivery_address_id` | text        | → `fulfillment_address.id`  |         |
| `created_at`          | timestamptz | NOT NULL                    | `now()` |
| `updated_at`          | timestamptz | NOT NULL                    | `now()` |
| `deleted_at`          | timestamptz |                             |         |
| `marked_shipped_by`   | text        |                             |         |
| `created_by`          | text        |                             |         |
| `requires_shipping`   | bool        | NOT NULL                    | `true`  |

### `fulfillment_address`

<sub>15 columns · 24 kB</sub>

| Column         | Type        | Constraints | Default |
| -------------- | ----------- | ----------- | ------- |
| `id`           | text        | PK          |         |
| `company`      | text        |             |         |
| `first_name`   | text        |             |         |
| `last_name`    | text        |             |         |
| `address_1`    | text        |             |         |
| `address_2`    | text        |             |         |
| `city`         | text        |             |         |
| `country_code` | text        |             |         |
| `province`     | text        |             |         |
| `postal_code`  | text        |             |         |
| `phone`        | text        |             |         |
| `metadata`     | jsonb       |             |         |
| `created_at`   | timestamptz | NOT NULL    | `now()` |
| `updated_at`   | timestamptz | NOT NULL    | `now()` |
| `deleted_at`   | timestamptz |             |         |

### `fulfillment_item`

<sub>12 columns · 48 kB</sub>

| Column              | Type        | Constraints                 | Default |
| ------------------- | ----------- | --------------------------- | ------- |
| `id`                | text        | PK                          |         |
| `title`             | text        | NOT NULL                    |         |
| `sku`               | text        | NOT NULL                    |         |
| `barcode`           | text        | NOT NULL                    |         |
| `quantity`          | numeric     | NOT NULL                    |         |
| `raw_quantity`      | jsonb       | NOT NULL                    |         |
| `line_item_id`      | text        |                             |         |
| `inventory_item_id` | text        |                             |         |
| `fulfillment_id`    | text        | → `fulfillment.id` NOT NULL |         |
| `created_at`        | timestamptz | NOT NULL                    | `now()` |
| `updated_at`        | timestamptz | NOT NULL                    | `now()` |
| `deleted_at`        | timestamptz |                             |         |

### `fulfillment_label`

<sub>8 columns · 32 kB</sub>

| Column            | Type        | Constraints                 | Default |
| ----------------- | ----------- | --------------------------- | ------- |
| `id`              | text        | PK                          |         |
| `tracking_number` | text        | NOT NULL                    |         |
| `tracking_url`    | text        | NOT NULL                    |         |
| `label_url`       | text        | NOT NULL                    |         |
| `fulfillment_id`  | text        | → `fulfillment.id` NOT NULL |         |
| `created_at`      | timestamptz | NOT NULL                    | `now()` |
| `updated_at`      | timestamptz | NOT NULL                    | `now()` |
| `deleted_at`      | timestamptz |                             |         |

### `fulfillment_provider`

<sub>5 columns · 48 kB</sub>

| Column       | Type        | Constraints | Default |
| ------------ | ----------- | ----------- | ------- |
| `id`         | text        | PK          |         |
| `is_enabled` | bool        | NOT NULL    | `true`  |
| `created_at` | timestamptz | NOT NULL    | `now()` |
| `updated_at` | timestamptz | NOT NULL    | `now()` |
| `deleted_at` | timestamptz |             |         |

### `fulfillment_set`

<sub>7 columns · 56 kB</sub>

| Column       | Type        | Constraints | Default |
| ------------ | ----------- | ----------- | ------- |
| `id`         | text        | PK          |         |
| `name`       | text        | NOT NULL    |         |
| `type`       | text        | NOT NULL    |         |
| `metadata`   | jsonb       |             |         |
| `created_at` | timestamptz | NOT NULL    | `now()` |
| `updated_at` | timestamptz | NOT NULL    | `now()` |
| `deleted_at` | timestamptz |             |         |

### `geo_zone`

<sub>11 columns · 88 kB</sub>

| Column              | Type        | Constraints                  | Default     |
| ------------------- | ----------- | ---------------------------- | ----------- |
| `id`                | text        | PK                           |             |
| `type`              | text        | NOT NULL                     | `'country'` |
| `country_code`      | text        | NOT NULL                     |             |
| `province_code`     | text        |                              |             |
| `city`              | text        |                              |             |
| `service_zone_id`   | text        | → `service_zone.id` NOT NULL |             |
| `postal_expression` | jsonb       |                              |             |
| `metadata`          | jsonb       |                              |             |
| `created_at`        | timestamptz | NOT NULL                     | `now()`     |
| `updated_at`        | timestamptz | NOT NULL                     | `now()`     |
| `deleted_at`        | timestamptz |                              |             |

### `service_zone`

<sub>7 columns · 72 kB</sub>

| Column               | Type        | Constraints                     | Default |
| -------------------- | ----------- | ------------------------------- | ------- |
| `id`                 | text        | PK                              |         |
| `name`               | text        | NOT NULL                        |         |
| `metadata`           | jsonb       |                                 |         |
| `fulfillment_set_id` | text        | → `fulfillment_set.id` NOT NULL |         |
| `created_at`         | timestamptz | NOT NULL                        | `now()` |
| `updated_at`         | timestamptz | NOT NULL                        | `now()` |
| `deleted_at`         | timestamptz |                                 |         |

### `shipping_option`

<sub>12 columns · 104 kB</sub>

| Column                    | Type        | Constraints                          | Default  |
| ------------------------- | ----------- | ------------------------------------ | -------- |
| `id`                      | text        | PK                                   |          |
| `name`                    | text        | NOT NULL                             |          |
| `price_type`              | text        | NOT NULL                             | `'flat'` |
| `service_zone_id`         | text        | → `service_zone.id` NOT NULL         |          |
| `shipping_profile_id`     | text        | → `shipping_profile.id`              |          |
| `provider_id`             | text        | → `fulfillment_provider.id`          |          |
| `data`                    | jsonb       |                                      |          |
| `metadata`                | jsonb       |                                      |          |
| `shipping_option_type_id` | text        | → `shipping_option_type.id` NOT NULL |          |
| `created_at`              | timestamptz | NOT NULL                             | `now()`  |
| `updated_at`              | timestamptz | NOT NULL                             | `now()`  |
| `deleted_at`              | timestamptz |                                      |          |

### `shipping_option_rule`

<sub>8 columns · 56 kB</sub>

| Column               | Type        | Constraints                     | Default |
| -------------------- | ----------- | ------------------------------- | ------- |
| `id`                 | text        | PK                              |         |
| `attribute`          | text        | NOT NULL                        |         |
| `operator`           | text        | NOT NULL                        |         |
| `value`              | jsonb       |                                 |         |
| `shipping_option_id` | text        | → `shipping_option.id` NOT NULL |         |
| `created_at`         | timestamptz | NOT NULL                        | `now()` |
| `updated_at`         | timestamptz | NOT NULL                        | `now()` |
| `deleted_at`         | timestamptz |                                 |         |

### `shipping_option_type`

<sub>7 columns · 40 kB</sub>

| Column        | Type        | Constraints | Default |
| ------------- | ----------- | ----------- | ------- |
| `id`          | text        | PK          |         |
| `label`       | text        | NOT NULL    |         |
| `description` | text        |             |         |
| `code`        | text        | NOT NULL    |         |
| `created_at`  | timestamptz | NOT NULL    | `now()` |
| `updated_at`  | timestamptz | NOT NULL    | `now()` |
| `deleted_at`  | timestamptz |             |         |

### `shipping_profile`

<sub>7 columns · 56 kB</sub>

| Column       | Type        | Constraints | Default |
| ------------ | ----------- | ----------- | ------- |
| `id`         | text        | PK          |         |
| `name`       | text        | NOT NULL    |         |
| `type`       | text        | NOT NULL    |         |
| `metadata`   | jsonb       |             |         |
| `created_at` | timestamptz | NOT NULL    | `now()` |
| `updated_at` | timestamptz | NOT NULL    | `now()` |
| `deleted_at` | timestamptz |             |         |

## Promotion

Discount codes, powering the storefront `DiscountCode` component.

### `application_method_buy_rules`

<sub>2 columns · 16 kB</sub>

| Column                  | Type | Constraints                            | Default |
| ----------------------- | ---- | -------------------------------------- | ------- |
| `application_method_id` | text | PK → `promotion_application_method.id` |         |
| `promotion_rule_id`     | text | PK → `promotion_rule.id`               |         |

### `application_method_target_rules`

<sub>2 columns · 16 kB</sub>

| Column                  | Type | Constraints                            | Default |
| ----------------------- | ---- | -------------------------------------- | ------- |
| `application_method_id` | text | PK → `promotion_application_method.id` |         |
| `promotion_rule_id`     | text | PK → `promotion_rule.id`               |         |

### `promotion`

<sub>13 columns · 64 kB</sub>

| Column             | Type        | Constraints               | Default   |
| ------------------ | ----------- | ------------------------- | --------- |
| `id`               | text        | PK                        |           |
| `code`             | text        | NOT NULL                  |           |
| `campaign_id`      | text        | → `promotion_campaign.id` |           |
| `is_automatic`     | bool        | NOT NULL                  | `false`   |
| `type`             | text        | NOT NULL                  |           |
| `created_at`       | timestamptz | NOT NULL                  | `now()`   |
| `updated_at`       | timestamptz | NOT NULL                  | `now()`   |
| `deleted_at`       | timestamptz |                           |           |
| `status`           | text        | NOT NULL                  | `'draft'` |
| `is_tax_inclusive` | bool        | NOT NULL                  | `false`   |
| `limit`            | int         |                           |           |
| `used`             | int         | NOT NULL                  | `0`       |
| `metadata`         | jsonb       |                           |           |

### `promotion_application_method`

<sub>14 columns · 64 kB</sub>

| Column                   | Type        | Constraints               | Default |
| ------------------------ | ----------- | ------------------------- | ------- |
| `id`                     | text        | PK                        |         |
| `value`                  | numeric     |                           |         |
| `raw_value`              | jsonb       |                           |         |
| `max_quantity`           | int         |                           |         |
| `apply_to_quantity`      | int         |                           |         |
| `buy_rules_min_quantity` | int         |                           |         |
| `type`                   | text        | NOT NULL                  |         |
| `target_type`            | text        | NOT NULL                  |         |
| `allocation`             | text        |                           |         |
| `promotion_id`           | text        | → `promotion.id` NOT NULL |         |
| `created_at`             | timestamptz | NOT NULL                  | `now()` |
| `updated_at`             | timestamptz | NOT NULL                  | `now()` |
| `deleted_at`             | timestamptz |                           |         |
| `currency_code`          | text        |                           |         |

### `promotion_campaign`

<sub>9 columns · 32 kB</sub>

| Column                | Type        | Constraints | Default |
| --------------------- | ----------- | ----------- | ------- |
| `id`                  | text        | PK          |         |
| `name`                | text        | NOT NULL    |         |
| `description`         | text        |             |         |
| `campaign_identifier` | text        | NOT NULL    |         |
| `starts_at`           | timestamptz |             |         |
| `ends_at`             | timestamptz |             |         |
| `created_at`          | timestamptz | NOT NULL    | `now()` |
| `updated_at`          | timestamptz | NOT NULL    | `now()` |
| `deleted_at`          | timestamptz |             |         |

### `promotion_campaign_budget`

<sub>12 columns · 40 kB</sub>

| Column          | Type        | Constraints                        | Default |
| --------------- | ----------- | ---------------------------------- | ------- |
| `id`            | text        | PK                                 |         |
| `type`          | text        | NOT NULL                           |         |
| `campaign_id`   | text        | → `promotion_campaign.id` NOT NULL |         |
| `limit`         | numeric     |                                    |         |
| `raw_limit`     | jsonb       |                                    |         |
| `used`          | numeric     | NOT NULL                           | `0`     |
| `raw_used`      | jsonb       | NOT NULL                           |         |
| `created_at`    | timestamptz | NOT NULL                           | `now()` |
| `updated_at`    | timestamptz | NOT NULL                           | `now()` |
| `deleted_at`    | timestamptz |                                    |         |
| `currency_code` | text        |                                    |         |
| `attribute`     | text        |                                    |         |

### `promotion_campaign_budget_usage`

<sub>8 columns · 40 kB</sub>

| Column            | Type        | Constraints                               | Default |
| ----------------- | ----------- | ----------------------------------------- | ------- |
| `id`              | text        | PK                                        |         |
| `attribute_value` | text        | NOT NULL                                  |         |
| `used`            | numeric     | NOT NULL                                  | `0`     |
| `budget_id`       | text        | → `promotion_campaign_budget.id` NOT NULL |         |
| `raw_used`        | jsonb       | NOT NULL                                  |         |
| `created_at`      | timestamptz | NOT NULL                                  | `now()` |
| `updated_at`      | timestamptz | NOT NULL                                  | `now()` |
| `deleted_at`      | timestamptz |                                           |         |

### `promotion_promotion_rule`

<sub>2 columns · 16 kB</sub>

| Column              | Type | Constraints              | Default |
| ------------------- | ---- | ------------------------ | ------- |
| `promotion_id`      | text | PK → `promotion.id`      |         |
| `promotion_rule_id` | text | PK → `promotion_rule.id` |         |

### `promotion_rule`

<sub>7 columns · 56 kB</sub>

| Column        | Type        | Constraints | Default |
| ------------- | ----------- | ----------- | ------- |
| `id`          | text        | PK          |         |
| `description` | text        |             |         |
| `attribute`   | text        | NOT NULL    |         |
| `operator`    | text        | NOT NULL    |         |
| `created_at`  | timestamptz | NOT NULL    | `now()` |
| `updated_at`  | timestamptz | NOT NULL    | `now()` |
| `deleted_at`  | timestamptz |             |         |

### `promotion_rule_value`

<sub>6 columns · 48 kB</sub>

| Column              | Type        | Constraints                    | Default |
| ------------------- | ----------- | ------------------------------ | ------- |
| `id`                | text        | PK                             |         |
| `promotion_rule_id` | text        | → `promotion_rule.id` NOT NULL |         |
| `value`             | text        | NOT NULL                       |         |
| `created_at`        | timestamptz | NOT NULL                       | `now()` |
| `updated_at`        | timestamptz | NOT NULL                       | `now()` |
| `deleted_at`        | timestamptz |                                |         |

## Cart

Pre-purchase state; becomes an order on completion.

### `cart`

<sub>14 columns · 136 kB</sub>

| Column                | Type        | Constraints         | Default |
| --------------------- | ----------- | ------------------- | ------- |
| `id`                  | text        | PK                  |         |
| `region_id`           | text        |                     |         |
| `customer_id`         | text        |                     |         |
| `sales_channel_id`    | text        |                     |         |
| `email`               | text        |                     |         |
| `currency_code`       | text        | NOT NULL            |         |
| `shipping_address_id` | text        | → `cart_address.id` |         |
| `billing_address_id`  | text        | → `cart_address.id` |         |
| `metadata`            | jsonb       |                     |         |
| `created_at`          | timestamptz | NOT NULL            | `now()` |
| `updated_at`          | timestamptz | NOT NULL            | `now()` |
| `deleted_at`          | timestamptz |                     |         |
| `completed_at`        | timestamptz |                     |         |
| `locale`              | text        |                     |         |

### `cart_address`

<sub>16 columns · 40 kB</sub>

| Column         | Type        | Constraints | Default |
| -------------- | ----------- | ----------- | ------- |
| `id`           | text        | PK          |         |
| `customer_id`  | text        |             |         |
| `company`      | text        |             |         |
| `first_name`   | text        |             |         |
| `last_name`    | text        |             |         |
| `address_1`    | text        |             |         |
| `address_2`    | text        |             |         |
| `city`         | text        |             |         |
| `country_code` | text        |             |         |
| `province`     | text        |             |         |
| `postal_code`  | text        |             |         |
| `phone`        | text        |             |         |
| `metadata`     | jsonb       |             |         |
| `created_at`   | timestamptz | NOT NULL    | `now()` |
| `updated_at`   | timestamptz | NOT NULL    | `now()` |
| `deleted_at`   | timestamptz |             |         |

### `cart_line_item`

<sub>32 columns · 88 kB</sub>

| Column                      | Type        | Constraints          | Default |
| --------------------------- | ----------- | -------------------- | ------- |
| `id`                        | text        | PK                   |         |
| `cart_id`                   | text        | → `cart.id` NOT NULL |         |
| `title`                     | text        | NOT NULL             |         |
| `subtitle`                  | text        |                      |         |
| `thumbnail`                 | text        |                      |         |
| `quantity`                  | int         | NOT NULL             |         |
| `variant_id`                | text        |                      |         |
| `product_id`                | text        |                      |         |
| `product_title`             | text        |                      |         |
| `product_description`       | text        |                      |         |
| `product_subtitle`          | text        |                      |         |
| `product_type`              | text        |                      |         |
| `product_collection`        | text        |                      |         |
| `product_handle`            | text        |                      |         |
| `variant_sku`               | text        |                      |         |
| `variant_barcode`           | text        |                      |         |
| `variant_title`             | text        |                      |         |
| `variant_option_values`     | jsonb       |                      |         |
| `requires_shipping`         | bool        | NOT NULL             | `true`  |
| `is_discountable`           | bool        | NOT NULL             | `true`  |
| `is_tax_inclusive`          | bool        | NOT NULL             | `false` |
| `compare_at_unit_price`     | numeric     |                      |         |
| `raw_compare_at_unit_price` | jsonb       |                      |         |
| `unit_price`                | numeric     | NOT NULL             |         |
| `raw_unit_price`            | jsonb       | NOT NULL             |         |
| `metadata`                  | jsonb       |                      |         |
| `created_at`                | timestamptz | NOT NULL             | `now()` |
| `updated_at`                | timestamptz | NOT NULL             | `now()` |
| `deleted_at`                | timestamptz |                      |         |
| `product_type_id`           | text        |                      |         |
| `is_custom_price`           | bool        | NOT NULL             | `false` |
| `is_giftcard`               | bool        | NOT NULL             | `false` |

### `cart_line_item_adjustment`

<sub>13 columns · 40 kB</sub>

| Column             | Type        | Constraints           | Default |
| ------------------ | ----------- | --------------------- | ------- |
| `id`               | text        | PK                    |         |
| `description`      | text        |                       |         |
| `promotion_id`     | text        |                       |         |
| `code`             | text        |                       |         |
| `amount`           | numeric     | NOT NULL              |         |
| `raw_amount`       | jsonb       | NOT NULL              |         |
| `provider_id`      | text        |                       |         |
| `metadata`         | jsonb       |                       |         |
| `created_at`       | timestamptz | NOT NULL              | `now()` |
| `updated_at`       | timestamptz | NOT NULL              | `now()` |
| `deleted_at`       | timestamptz |                       |         |
| `item_id`          | text        | → `cart_line_item.id` |         |
| `is_tax_inclusive` | bool        | NOT NULL              | `false` |

### `cart_line_item_tax_line`

<sub>11 columns · 40 kB</sub>

| Column        | Type        | Constraints           | Default |
| ------------- | ----------- | --------------------- | ------- |
| `id`          | text        | PK                    |         |
| `description` | text        |                       |         |
| `tax_rate_id` | text        |                       |         |
| `code`        | text        | NOT NULL              |         |
| `rate`        | float4      | NOT NULL              |         |
| `provider_id` | text        |                       |         |
| `metadata`    | jsonb       |                       |         |
| `created_at`  | timestamptz | NOT NULL              | `now()` |
| `updated_at`  | timestamptz | NOT NULL              | `now()` |
| `deleted_at`  | timestamptz |                       |         |
| `item_id`     | text        | → `cart_line_item.id` |         |

### `cart_shipping_method`

<sub>13 columns · 72 kB</sub>

| Column               | Type        | Constraints          | Default |
| -------------------- | ----------- | -------------------- | ------- |
| `id`                 | text        | PK                   |         |
| `cart_id`            | text        | → `cart.id` NOT NULL |         |
| `name`               | text        | NOT NULL             |         |
| `description`        | jsonb       |                      |         |
| `amount`             | numeric     | NOT NULL             |         |
| `raw_amount`         | jsonb       | NOT NULL             |         |
| `is_tax_inclusive`   | bool        | NOT NULL             | `false` |
| `shipping_option_id` | text        |                      |         |
| `data`               | jsonb       |                      |         |
| `metadata`           | jsonb       |                      |         |
| `created_at`         | timestamptz | NOT NULL             | `now()` |
| `updated_at`         | timestamptz | NOT NULL             | `now()` |
| `deleted_at`         | timestamptz |                      |         |

### `cart_shipping_method_adjustment`

<sub>12 columns · 40 kB</sub>

| Column               | Type        | Constraints                 | Default |
| -------------------- | ----------- | --------------------------- | ------- |
| `id`                 | text        | PK                          |         |
| `description`        | text        |                             |         |
| `promotion_id`       | text        |                             |         |
| `code`               | text        |                             |         |
| `amount`             | numeric     | NOT NULL                    |         |
| `raw_amount`         | jsonb       | NOT NULL                    |         |
| `provider_id`        | text        |                             |         |
| `metadata`           | jsonb       |                             |         |
| `created_at`         | timestamptz | NOT NULL                    | `now()` |
| `updated_at`         | timestamptz | NOT NULL                    | `now()` |
| `deleted_at`         | timestamptz |                             |         |
| `shipping_method_id` | text        | → `cart_shipping_method.id` |         |

### `cart_shipping_method_tax_line`

<sub>11 columns · 40 kB</sub>

| Column               | Type        | Constraints                 | Default |
| -------------------- | ----------- | --------------------------- | ------- |
| `id`                 | text        | PK                          |         |
| `description`        | text        |                             |         |
| `tax_rate_id`        | text        |                             |         |
| `code`               | text        | NOT NULL                    |         |
| `rate`               | float4      | NOT NULL                    |         |
| `provider_id`        | text        |                             |         |
| `metadata`           | jsonb       |                             |         |
| `created_at`         | timestamptz | NOT NULL                    | `now()` |
| `updated_at`         | timestamptz | NOT NULL                    | `now()` |
| `deleted_at`         | timestamptz |                             |         |
| `shipping_method_id` | text        | → `cart_shipping_method.id` |         |

### `credit_line`

<sub>10 columns · 40 kB</sub>

| Column         | Type        | Constraints          | Default |
| -------------- | ----------- | -------------------- | ------- |
| `id`           | text        | PK                   |         |
| `cart_id`      | text        | → `cart.id` NOT NULL |         |
| `reference`    | text        |                      |         |
| `reference_id` | text        |                      |         |
| `amount`       | numeric     | NOT NULL             |         |
| `raw_amount`   | jsonb       | NOT NULL             |         |
| `metadata`     | jsonb       |                      |         |
| `created_at`   | timestamptz | NOT NULL             | `now()` |
| `updated_at`   | timestamptz | NOT NULL             | `now()` |
| `deleted_at`   | timestamptz |                      |         |

## Payment

Bank transfer only (`pp_system_default`). No gateway tables.

### `account_holder`

<sub>9 columns · 32 kB</sub>

| Column        | Type        | Constraints | Default |
| ------------- | ----------- | ----------- | ------- |
| `id`          | text        | PK          |         |
| `provider_id` | text        | NOT NULL    |         |
| `external_id` | text        | NOT NULL    |         |
| `email`       | text        |             |         |
| `data`        | jsonb       | NOT NULL    | `'{}'`  |
| `metadata`    | jsonb       |             |         |
| `created_at`  | timestamptz | NOT NULL    | `now()` |
| `updated_at`  | timestamptz | NOT NULL    | `now()` |
| `deleted_at`  | timestamptz |             |         |

### `capture`

<sub>9 columns · 32 kB</sub>

| Column       | Type        | Constraints             | Default |
| ------------ | ----------- | ----------------------- | ------- |
| `id`         | text        | PK                      |         |
| `amount`     | numeric     | NOT NULL                |         |
| `raw_amount` | jsonb       | NOT NULL                |         |
| `payment_id` | text        | → `payment.id` NOT NULL |         |
| `created_at` | timestamptz | NOT NULL                | `now()` |
| `updated_at` | timestamptz | NOT NULL                | `now()` |
| `deleted_at` | timestamptz |                         |         |
| `created_by` | text        |                         |         |
| `metadata`   | jsonb       |                         |         |

### `payment`

<sub>14 columns · 104 kB</sub>

| Column                  | Type        | Constraints                        | Default |
| ----------------------- | ----------- | ---------------------------------- | ------- |
| `id`                    | text        | PK                                 |         |
| `amount`                | numeric     | NOT NULL                           |         |
| `raw_amount`            | jsonb       | NOT NULL                           |         |
| `currency_code`         | text        | NOT NULL                           |         |
| `provider_id`           | text        | NOT NULL                           |         |
| `data`                  | jsonb       |                                    |         |
| `created_at`            | timestamptz | NOT NULL                           | `now()` |
| `updated_at`            | timestamptz | NOT NULL                           | `now()` |
| `deleted_at`            | timestamptz |                                    |         |
| `captured_at`           | timestamptz |                                    |         |
| `canceled_at`           | timestamptz |                                    |         |
| `payment_collection_id` | text        | → `payment_collection.id` NOT NULL |         |
| `payment_session_id`    | text        | NOT NULL                           |         |
| `metadata`              | jsonb       |                                    |         |

### `payment_collection`

<sub>16 columns · 40 kB</sub>

| Column                  | Type        | Constraints | Default      |
| ----------------------- | ----------- | ----------- | ------------ |
| `id`                    | text        | PK          |              |
| `currency_code`         | text        | NOT NULL    |              |
| `amount`                | numeric     | NOT NULL    |              |
| `raw_amount`            | jsonb       | NOT NULL    |              |
| `authorized_amount`     | numeric     |             |              |
| `raw_authorized_amount` | jsonb       |             |              |
| `captured_amount`       | numeric     |             |              |
| `raw_captured_amount`   | jsonb       |             |              |
| `refunded_amount`       | numeric     |             |              |
| `raw_refunded_amount`   | jsonb       |             |              |
| `created_at`            | timestamptz | NOT NULL    | `now()`      |
| `updated_at`            | timestamptz | NOT NULL    | `now()`      |
| `deleted_at`            | timestamptz |             |              |
| `completed_at`          | timestamptz |             |              |
| `status`                | text        | NOT NULL    | `'not_paid'` |
| `metadata`              | jsonb       |             |              |

### `payment_collection_payment_providers`

<sub>2 columns · 16 kB</sub>

| Column                  | Type | Constraints                  | Default |
| ----------------------- | ---- | ---------------------------- | ------- |
| `payment_collection_id` | text | PK → `payment_collection.id` |         |
| `payment_provider_id`   | text | PK → `payment_provider.id`   |         |

### `payment_provider`

<sub>5 columns · 48 kB</sub>

| Column       | Type        | Constraints | Default |
| ------------ | ----------- | ----------- | ------- |
| `id`         | text        | PK          |         |
| `is_enabled` | bool        | NOT NULL    | `true`  |
| `created_at` | timestamptz | NOT NULL    | `now()` |
| `updated_at` | timestamptz | NOT NULL    | `now()` |
| `deleted_at` | timestamptz |             |         |

### `payment_session`

<sub>14 columns · 64 kB</sub>

| Column                  | Type        | Constraints                        | Default     |
| ----------------------- | ----------- | ---------------------------------- | ----------- |
| `id`                    | text        | PK                                 |             |
| `currency_code`         | text        | NOT NULL                           |             |
| `amount`                | numeric     | NOT NULL                           |             |
| `raw_amount`            | jsonb       | NOT NULL                           |             |
| `provider_id`           | text        | NOT NULL                           |             |
| `data`                  | jsonb       | NOT NULL                           | `'{}'`      |
| `context`               | jsonb       |                                    |             |
| `status`                | text        | NOT NULL                           | `'pending'` |
| `authorized_at`         | timestamptz |                                    |             |
| `payment_collection_id` | text        | → `payment_collection.id` NOT NULL |             |
| `metadata`              | jsonb       |                                    |             |
| `created_at`            | timestamptz | NOT NULL                           | `now()`     |
| `updated_at`            | timestamptz | NOT NULL                           | `now()`     |
| `deleted_at`            | timestamptz |                                    |             |

### `refund`

<sub>11 columns · 40 kB</sub>

| Column             | Type        | Constraints             | Default |
| ------------------ | ----------- | ----------------------- | ------- |
| `id`               | text        | PK                      |         |
| `amount`           | numeric     | NOT NULL                |         |
| `raw_amount`       | jsonb       | NOT NULL                |         |
| `payment_id`       | text        | → `payment.id` NOT NULL |         |
| `created_at`       | timestamptz | NOT NULL                | `now()` |
| `updated_at`       | timestamptz | NOT NULL                | `now()` |
| `deleted_at`       | timestamptz |                         |         |
| `created_by`       | text        |                         |         |
| `metadata`         | jsonb       |                         |         |
| `refund_reason_id` | text        |                         |         |
| `note`             | text        |                         |         |

### `refund_reason`

<sub>8 columns · 48 kB</sub>

| Column        | Type        | Constraints | Default |
| ------------- | ----------- | ----------- | ------- |
| `id`          | text        | PK          |         |
| `label`       | text        | NOT NULL    |         |
| `description` | text        |             |         |
| `metadata`    | jsonb       |             |         |
| `created_at`  | timestamptz | NOT NULL    | `now()` |
| `updated_at`  | timestamptz | NOT NULL    | `now()` |
| `deleted_at`  | timestamptz |             |         |
| `code`        | text        | NOT NULL    |         |

## Auth

Identities, MFA factors and password-reset tokens.

### `auth_identity`

<sub>5 columns · 24 kB</sub>

| Column         | Type        | Constraints | Default |
| -------------- | ----------- | ----------- | ------- |
| `id`           | text        | PK          |         |
| `app_metadata` | jsonb       |             |         |
| `created_at`   | timestamptz | NOT NULL    | `now()` |
| `updated_at`   | timestamptz | NOT NULL    | `now()` |
| `deleted_at`   | timestamptz |             |         |

### `auth_mfa_factor`

<sub>9 columns · 40 kB</sub>

| Column              | Type        | Constraints                   | Default |
| ------------------- | ----------- | ----------------------------- | ------- |
| `id`                | text        | PK                            |         |
| `auth_identity_id`  | text        | → `auth_identity.id` NOT NULL |         |
| `provider`          | text        | NOT NULL                      |         |
| `status`            | text        | NOT NULL                      |         |
| `provider_metadata` | jsonb       |                               |         |
| `metadata`          | jsonb       |                               |         |
| `created_at`        | timestamptz | NOT NULL                      | `now()` |
| `updated_at`        | timestamptz | NOT NULL                      | `now()` |
| `deleted_at`        | timestamptz |                               |         |

### `auth_mfa_recovery_code`

<sub>6 columns · 40 kB</sub>

| Column             | Type        | Constraints                   | Default |
| ------------------ | ----------- | ----------------------------- | ------- |
| `id`               | text        | PK                            |         |
| `auth_identity_id` | text        | → `auth_identity.id` NOT NULL |         |
| `code_hash`        | text        | NOT NULL                      |         |
| `created_at`       | timestamptz | NOT NULL                      | `now()` |
| `updated_at`       | timestamptz | NOT NULL                      | `now()` |
| `deleted_at`       | timestamptz |                               |         |

### `auth_password_reset_token`

<sub>9 columns · 56 kB</sub>

| Column                 | Type        | Constraints                       | Default |
| ---------------------- | ----------- | --------------------------------- | ------- |
| `id`                   | text        | PK                                |         |
| `auth_identity_id`     | text        | → `auth_identity.id` NOT NULL     |         |
| `provider_identity_id` | text        | → `provider_identity.id` NOT NULL |         |
| `entity_id`            | text        | NOT NULL                          |         |
| `token_hash`           | text        | NOT NULL                          |         |
| `expires_at`           | timestamptz | NOT NULL                          |         |
| `created_at`           | timestamptz | NOT NULL                          | `now()` |
| `updated_at`           | timestamptz | NOT NULL                          | `now()` |
| `deleted_at`           | timestamptz |                                   |         |

### `auth_verification`

<sub>12 columns · 40 kB</sub>

| Column              | Type        | Constraints                   | Default |
| ------------------- | ----------- | ----------------------------- | ------- |
| `id`                | text        | PK                            |         |
| `auth_identity_id`  | text        | → `auth_identity.id` NOT NULL |         |
| `entity_id`         | text        | NOT NULL                      |         |
| `entity_type`       | text        | NOT NULL                      |         |
| `code_provider`     | text        | NOT NULL                      |         |
| `verified_at`       | timestamptz |                               |         |
| `requested_at`      | timestamptz | NOT NULL                      |         |
| `provider_metadata` | jsonb       |                               |         |
| `metadata`          | jsonb       |                               |         |
| `created_at`        | timestamptz | NOT NULL                      | `now()` |
| `updated_at`        | timestamptz | NOT NULL                      | `now()` |
| `deleted_at`        | timestamptz |                               |         |

### `provider_identity`

<sub>9 columns · 40 kB</sub>

| Column              | Type        | Constraints                   | Default |
| ------------------- | ----------- | ----------------------------- | ------- |
| `id`                | text        | PK                            |         |
| `entity_id`         | text        | NOT NULL                      |         |
| `provider`          | text        | NOT NULL                      |         |
| `auth_identity_id`  | text        | → `auth_identity.id` NOT NULL |         |
| `user_metadata`     | jsonb       |                               |         |
| `provider_metadata` | jsonb       |                               |         |
| `created_at`        | timestamptz | NOT NULL                      | `now()` |
| `updated_at`        | timestamptz | NOT NULL                      | `now()` |
| `deleted_at`        | timestamptz |                               |         |

## Pricing

Price sets and rules behind every product price.

### `price`

<sub>15 columns · 88 kB</sub>

| Column             | Type        | Constraints               | Default |
| ------------------ | ----------- | ------------------------- | ------- |
| `id`               | text        | PK                        |         |
| `title`            | text        |                           |         |
| `price_set_id`     | text        | → `price_set.id` NOT NULL |         |
| `currency_code`    | text        | NOT NULL                  |         |
| `raw_amount`       | jsonb       | NOT NULL                  |         |
| `rules_count`      | int         |                           | `0`     |
| `created_at`       | timestamptz | NOT NULL                  | `now()` |
| `updated_at`       | timestamptz | NOT NULL                  | `now()` |
| `deleted_at`       | timestamptz |                           |         |
| `price_list_id`    | text        | → `price_list.id`         |         |
| `amount`           | numeric     | NOT NULL                  |         |
| `min_quantity`     | numeric     |                           |         |
| `max_quantity`     | numeric     |                           |         |
| `raw_min_quantity` | jsonb       |                           |         |
| `raw_max_quantity` | jsonb       |                           |         |

### `price_list`

<sub>12 columns · 32 kB</sub>

| Column        | Type        | Constraints | Default   |
| ------------- | ----------- | ----------- | --------- |
| `id`          | text        | PK          |           |
| `status`      | text        | NOT NULL    | `'draft'` |
| `starts_at`   | timestamptz |             |           |
| `ends_at`     | timestamptz |             |           |
| `rules_count` | int         |             | `0`       |
| `title`       | text        | NOT NULL    |           |
| `description` | text        | NOT NULL    |           |
| `type`        | text        | NOT NULL    | `'sale'`  |
| `created_at`  | timestamptz | NOT NULL    | `now()`   |
| `updated_at`  | timestamptz | NOT NULL    | `now()`   |
| `deleted_at`  | timestamptz |             |           |
| `metadata`    | jsonb       |             |           |

### `price_list_rule`

<sub>7 columns · 56 kB</sub>

| Column          | Type        | Constraints                | Default |
| --------------- | ----------- | -------------------------- | ------- |
| `id`            | text        | PK                         |         |
| `price_list_id` | text        | → `price_list.id` NOT NULL |         |
| `created_at`    | timestamptz | NOT NULL                   | `now()` |
| `updated_at`    | timestamptz | NOT NULL                   | `now()` |
| `deleted_at`    | timestamptz |                            |         |
| `value`         | jsonb       |                            |         |
| `attribute`     | text        | NOT NULL                   | `''`    |

### `price_preference`

<sub>7 columns · 56 kB</sub>

| Column             | Type        | Constraints | Default |
| ------------------ | ----------- | ----------- | ------- |
| `id`               | text        | PK          |         |
| `attribute`        | text        | NOT NULL    |         |
| `value`            | text        |             |         |
| `is_tax_inclusive` | bool        | NOT NULL    | `false` |
| `created_at`       | timestamptz | NOT NULL    | `now()` |
| `updated_at`       | timestamptz | NOT NULL    | `now()` |
| `deleted_at`       | timestamptz |             |         |

### `price_rule`

<sub>9 columns · 152 kB</sub>

| Column       | Type        | Constraints           | Default |
| ------------ | ----------- | --------------------- | ------- |
| `id`         | text        | PK                    |         |
| `value`      | text        | NOT NULL              |         |
| `priority`   | int         | NOT NULL              | `0`     |
| `price_id`   | text        | → `price.id` NOT NULL |         |
| `created_at` | timestamptz | NOT NULL              | `now()` |
| `updated_at` | timestamptz | NOT NULL              | `now()` |
| `deleted_at` | timestamptz |                       |         |
| `attribute`  | text        | NOT NULL              | `''`    |
| `operator`   | text        | NOT NULL              | `'eq'`  |

### `price_set`

<sub>4 columns · 40 kB</sub>

| Column       | Type        | Constraints | Default |
| ------------ | ----------- | ----------- | ------- |
| `id`         | text        | PK          |         |
| `created_at` | timestamptz | NOT NULL    | `now()` |
| `updated_at` | timestamptz | NOT NULL    | `now()` |
| `deleted_at` | timestamptz |             |         |

## Customer

Customer accounts, addresses and groups.

### `customer`

<sub>12 columns · 64 kB</sub>

| Column         | Type        | Constraints | Default |
| -------------- | ----------- | ----------- | ------- |
| `id`           | text        | PK          |         |
| `company_name` | text        |             |         |
| `first_name`   | text        |             |         |
| `last_name`    | text        |             |         |
| `email`        | text        |             |         |
| `phone`        | text        |             |         |
| `has_account`  | bool        | NOT NULL    | `false` |
| `metadata`     | jsonb       |             |         |
| `created_at`   | timestamptz | NOT NULL    | `now()` |
| `updated_at`   | timestamptz | NOT NULL    | `now()` |
| `deleted_at`   | timestamptz |             |         |
| `created_by`   | text        |             |         |

### `customer_address`

<sub>19 columns · 48 kB</sub>

| Column                | Type        | Constraints              | Default |
| --------------------- | ----------- | ------------------------ | ------- |
| `id`                  | text        | PK                       |         |
| `customer_id`         | text        | → `customer.id` NOT NULL |         |
| `address_name`        | text        |                          |         |
| `is_default_shipping` | bool        | NOT NULL                 | `false` |
| `is_default_billing`  | bool        | NOT NULL                 | `false` |
| `company`             | text        |                          |         |
| `first_name`          | text        |                          |         |
| `last_name`           | text        |                          |         |
| `address_1`           | text        |                          |         |
| `address_2`           | text        |                          |         |
| `city`                | text        |                          |         |
| `country_code`        | text        |                          |         |
| `province`            | text        |                          |         |
| `postal_code`         | text        |                          |         |
| `phone`               | text        |                          |         |
| `metadata`            | jsonb       |                          |         |
| `created_at`          | timestamptz | NOT NULL                 | `now()` |
| `updated_at`          | timestamptz | NOT NULL                 | `now()` |
| `deleted_at`          | timestamptz |                          |         |

### `customer_group`

<sub>7 columns · 32 kB</sub>

| Column       | Type        | Constraints | Default |
| ------------ | ----------- | ----------- | ------- |
| `id`         | text        | PK          |         |
| `name`       | text        | NOT NULL    |         |
| `metadata`   | jsonb       |             |         |
| `created_by` | text        |             |         |
| `created_at` | timestamptz | NOT NULL    | `now()` |
| `updated_at` | timestamptz | NOT NULL    | `now()` |
| `deleted_at` | timestamptz |             |         |

### `customer_group_customer`

<sub>8 columns · 40 kB</sub>

| Column              | Type        | Constraints                    | Default |
| ------------------- | ----------- | ------------------------------ | ------- |
| `id`                | text        | PK                             |         |
| `customer_id`       | text        | → `customer.id` NOT NULL       |         |
| `customer_group_id` | text        | → `customer_group.id` NOT NULL |         |
| `metadata`          | jsonb       |                                |         |
| `created_at`        | timestamptz | NOT NULL                       | `now()` |
| `updated_at`        | timestamptz | NOT NULL                       | `now()` |
| `created_by`        | text        |                                |         |
| `deleted_at`        | timestamptz |                                |         |

## Framework

Migration bookkeeping and workflow execution state.

### `link_module_migrations`

<sub>4 columns · 48 kB</sub>

| Column            | Type      | Constraints | Default                       |
| ----------------- | --------- | ----------- | ----------------------------- |
| `id`              | int       | PK          | `nextval('link_module_migra…` |
| `table_name`      | varchar   | NOT NULL    |                               |
| `link_descriptor` | jsonb     | NOT NULL    | `'{}'`                        |
| `created_at`      | timestamp |             | `CURRENT_TIMESTAMP`           |

### `mikro_orm_migrations`

<sub>3 columns · 56 kB</sub>

| Column        | Type        | Constraints | Default                       |
| ------------- | ----------- | ----------- | ----------------------------- |
| `id`          | int         | PK          | `nextval('mikro_orm_migrati…` |
| `name`        | varchar     |             |                               |
| `executed_at` | timestamptz |             | `CURRENT_TIMESTAMP`           |

### `script_migrations`

<sub>4 columns · 40 kB</sub>

| Column        | Type        | Constraints | Default                       |
| ------------- | ----------- | ----------- | ----------------------------- |
| `id`          | int         | PK          | `nextval('script_migrations…` |
| `script_name` | varchar     | NOT NULL    |                               |
| `created_at`  | timestamptz |             | `CURRENT_TIMESTAMP`           |
| `finished_at` | timestamptz |             |                               |

### `workflow_execution`

<sub>11 columns · 296 kB</sub>

| Column           | Type      | Constraints | Default                       |
| ---------------- | --------- | ----------- | ----------------------------- |
| `id`             | varchar   | NOT NULL    |                               |
| `workflow_id`    | varchar   | PK          |                               |
| `transaction_id` | varchar   | PK          |                               |
| `execution`      | jsonb     |             |                               |
| `context`        | jsonb     |             |                               |
| `state`          | varchar   | NOT NULL    |                               |
| `created_at`     | timestamp | NOT NULL    | `now()`                       |
| `updated_at`     | timestamp | NOT NULL    | `now()`                       |
| `deleted_at`     | timestamp |             |                               |
| `retention_time` | int       |             |                               |
| `run_id`         | text      | PK          | `'01M1WBJV8HH45HJYZKA5KPYPM…` |

## Tax

Tax regions and rates (one US region seeded).

### `tax_provider`

<sub>5 columns · 48 kB</sub>

| Column       | Type        | Constraints | Default |
| ------------ | ----------- | ----------- | ------- |
| `id`         | text        | PK          |         |
| `is_enabled` | bool        | NOT NULL    | `true`  |
| `created_at` | timestamptz | NOT NULL    | `now()` |
| `updated_at` | timestamptz | NOT NULL    | `now()` |
| `deleted_at` | timestamptz |             |         |

### `tax_rate`

<sub>12 columns · 40 kB</sub>

| Column          | Type        | Constraints                | Default |
| --------------- | ----------- | -------------------------- | ------- |
| `id`            | text        | PK                         |         |
| `rate`          | float4      |                            |         |
| `code`          | text        | NOT NULL                   |         |
| `name`          | text        | NOT NULL                   |         |
| `is_default`    | bool        | NOT NULL                   | `false` |
| `is_combinable` | bool        | NOT NULL                   | `false` |
| `tax_region_id` | text        | → `tax_region.id` NOT NULL |         |
| `metadata`      | jsonb       |                            |         |
| `created_at`    | timestamptz | NOT NULL                   | `now()` |
| `updated_at`    | timestamptz | NOT NULL                   | `now()` |
| `created_by`    | text        |                            |         |
| `deleted_at`    | timestamptz |                            |         |

### `tax_rate_rule`

<sub>9 columns · 48 kB</sub>

| Column         | Type        | Constraints              | Default |
| -------------- | ----------- | ------------------------ | ------- |
| `id`           | text        | PK                       |         |
| `tax_rate_id`  | text        | → `tax_rate.id` NOT NULL |         |
| `reference_id` | text        | NOT NULL                 |         |
| `reference`    | text        | NOT NULL                 |         |
| `metadata`     | jsonb       |                          |         |
| `created_at`   | timestamptz | NOT NULL                 | `now()` |
| `updated_at`   | timestamptz | NOT NULL                 | `now()` |
| `created_by`   | text        |                          |         |
| `deleted_at`   | timestamptz |                          |         |

### `tax_region`

<sub>10 columns · 104 kB</sub>

| Column          | Type        | Constraints         | Default |
| --------------- | ----------- | ------------------- | ------- |
| `id`            | text        | PK                  |         |
| `provider_id`   | text        | → `tax_provider.id` |         |
| `country_code`  | text        | NOT NULL            |         |
| `province_code` | text        |                     |         |
| `parent_id`     | text        | → `tax_region.id`   |         |
| `metadata`      | jsonb       |                     |         |
| `created_at`    | timestamptz | NOT NULL            | `now()` |
| `updated_at`    | timestamptz | NOT NULL            | `now()` |
| `created_by`    | text        |                     |         |
| `deleted_at`    | timestamptz |                     |         |

## Custom - content (CMS)

Mini-CMS: policies, blog, site settings.

### `content_article`

<sub>20 columns · 32 kB</sub>

| Column                 | Type        | Constraints | Default   |
| ---------------------- | ----------- | ----------- | --------- |
| `id`                   | text        | PK          |           |
| `slug`                 | text        | NOT NULL    |           |
| `locale`               | text        | NOT NULL    |           |
| `title`                | text        | NOT NULL    |           |
| `excerpt`              | text        |             |           |
| `body`                 | text        | NOT NULL    |           |
| `hero_image`           | text        |             |           |
| `author_name`          | text        |             |           |
| `author_credentials`   | text        |             |           |
| `reviewer_name`        | text        |             |           |
| `reviewer_credentials` | text        |             |           |
| `reviewed_at`          | text        |             |           |
| `category`             | text        |             |           |
| `seo_title`            | text        |             |           |
| `seo_description`      | text        |             |           |
| `status`               | text        | NOT NULL    | `'draft'` |
| `published_at`         | text        |             |           |
| `created_at`           | timestamptz | NOT NULL    | `now()`   |
| `updated_at`           | timestamptz | NOT NULL    | `now()`   |
| `deleted_at`           | timestamptz |             |           |

### `content_page`

<sub>14 columns · 32 kB</sub>

| Column            | Type        | Constraints | Default       |
| ----------------- | ----------- | ----------- | ------------- |
| `id`              | text        | PK          |               |
| `slug`            | text        | NOT NULL    |               |
| `locale`          | text        | NOT NULL    |               |
| `type`            | text        | NOT NULL    | `'legal'`     |
| `title`           | text        | NOT NULL    |               |
| `body`            | text        | NOT NULL    |               |
| `excerpt`         | text        |             |               |
| `seo_title`       | text        |             |               |
| `seo_description` | text        |             |               |
| `status`          | text        | NOT NULL    | `'published'` |
| `last_updated`    | text        |             |               |
| `created_at`      | timestamptz | NOT NULL    | `now()`       |
| `updated_at`      | timestamptz | NOT NULL    | `now()`       |
| `deleted_at`      | timestamptz |             |               |

### `content_site_setting`

<sub>7 columns · 32 kB</sub>

| Column       | Type        | Constraints | Default |
| ------------ | ----------- | ----------- | ------- |
| `id`         | text        | PK          |         |
| `key`        | text        | NOT NULL    |         |
| `value`      | jsonb       | NOT NULL    |         |
| `label`      | text        |             |         |
| `created_at` | timestamptz | NOT NULL    | `now()` |
| `updated_at` | timestamptz | NOT NULL    | `now()` |
| `deleted_at` | timestamptz |             |         |

## Inventory

Stock levels and reservations.

### `inventory_item`

<sub>18 columns · 56 kB</sub>

| Column              | Type        | Constraints | Default |
| ------------------- | ----------- | ----------- | ------- |
| `id`                | text        | PK          |         |
| `created_at`        | timestamptz | NOT NULL    | `now()` |
| `updated_at`        | timestamptz | NOT NULL    | `now()` |
| `deleted_at`        | timestamptz |             |         |
| `sku`               | text        |             |         |
| `origin_country`    | text        |             |         |
| `hs_code`           | text        |             |         |
| `mid_code`          | text        |             |         |
| `material`          | text        |             |         |
| `weight`            | int         |             |         |
| `length`            | int         |             |         |
| `height`            | int         |             |         |
| `width`             | int         |             |         |
| `requires_shipping` | bool        | NOT NULL    | `true`  |
| `description`       | text        |             |         |
| `title`             | text        |             |         |
| `thumbnail`         | text        |             |         |
| `metadata`          | jsonb       |             |         |

### `inventory_level`

<sub>13 columns · 88 kB</sub>

| Column                  | Type        | Constraints                    | Default |
| ----------------------- | ----------- | ------------------------------ | ------- |
| `id`                    | text        | PK                             |         |
| `created_at`            | timestamptz | NOT NULL                       | `now()` |
| `updated_at`            | timestamptz | NOT NULL                       | `now()` |
| `deleted_at`            | timestamptz |                                |         |
| `inventory_item_id`     | text        | → `inventory_item.id` NOT NULL |         |
| `location_id`           | text        | NOT NULL                       |         |
| `stocked_quantity`      | numeric     | NOT NULL                       | `0`     |
| `reserved_quantity`     | numeric     | NOT NULL                       | `0`     |
| `incoming_quantity`     | numeric     | NOT NULL                       | `0`     |
| `metadata`              | jsonb       |                                |         |
| `raw_stocked_quantity`  | jsonb       |                                |         |
| `raw_reserved_quantity` | jsonb       |                                |         |
| `raw_incoming_quantity` | jsonb       |                                |         |

### `reservation_item`

<sub>14 columns · 88 kB</sub>

| Column              | Type        | Constraints                    | Default |
| ------------------- | ----------- | ------------------------------ | ------- |
| `id`                | text        | PK                             |         |
| `created_at`        | timestamptz | NOT NULL                       | `now()` |
| `updated_at`        | timestamptz | NOT NULL                       | `now()` |
| `deleted_at`        | timestamptz |                                |         |
| `line_item_id`      | text        |                                |         |
| `location_id`       | text        | NOT NULL                       |         |
| `quantity`          | numeric     | NOT NULL                       |         |
| `external_id`       | text        |                                |         |
| `description`       | text        |                                |         |
| `created_by`        | text        |                                |         |
| `metadata`          | jsonb       |                                |         |
| `inventory_item_id` | text        | → `inventory_item.id` NOT NULL |         |
| `allow_backorder`   | bool        |                                | `false` |
| `raw_quantity`      | jsonb       |                                |         |

## Settings

Admin view configuration and user preferences.

### `property_label`

<sub>8 columns · 40 kB</sub>

| Column        | Type        | Constraints | Default |
| ------------- | ----------- | ----------- | ------- |
| `id`          | text        | PK          |         |
| `entity`      | text        | NOT NULL    |         |
| `property`    | text        | NOT NULL    |         |
| `label`       | text        | NOT NULL    |         |
| `description` | text        |             |         |
| `created_at`  | timestamptz | NOT NULL    | `now()` |
| `updated_at`  | timestamptz | NOT NULL    | `now()` |
| `deleted_at`  | timestamptz |             |         |

### `user_preference`

<sub>7 columns · 40 kB</sub>

| Column       | Type        | Constraints | Default |
| ------------ | ----------- | ----------- | ------- |
| `id`         | text        | PK          |         |
| `user_id`    | text        | NOT NULL    |         |
| `key`        | text        | NOT NULL    |         |
| `value`      | jsonb       | NOT NULL    |         |
| `created_at` | timestamptz | NOT NULL    | `now()` |
| `updated_at` | timestamptz | NOT NULL    | `now()` |
| `deleted_at` | timestamptz |             |         |

### `view_configuration`

<sub>9 columns · 48 kB</sub>

| Column              | Type        | Constraints | Default |
| ------------------- | ----------- | ----------- | ------- |
| `id`                | text        | PK          |         |
| `entity`            | text        | NOT NULL    |         |
| `name`              | text        |             |         |
| `user_id`           | text        |             |         |
| `is_system_default` | bool        | NOT NULL    | `false` |
| `configuration`     | jsonb       | NOT NULL    |         |
| `created_at`        | timestamptz | NOT NULL    | `now()` |
| `updated_at`        | timestamptz | NOT NULL    | `now()` |
| `deleted_at`        | timestamptz |             |         |

## Store

Store record, supported currencies and locales.

### `store`

<sub>9 columns · 40 kB</sub>

| Column                     | Type        | Constraints | Default          |
| -------------------------- | ----------- | ----------- | ---------------- |
| `id`                       | text        | PK          |                  |
| `name`                     | text        | NOT NULL    | `'Medusa Store'` |
| `default_sales_channel_id` | text        |             |                  |
| `default_region_id`        | text        |             |                  |
| `default_location_id`      | text        |             |                  |
| `metadata`                 | jsonb       |             |                  |
| `created_at`               | timestamptz | NOT NULL    | `now()`          |
| `updated_at`               | timestamptz | NOT NULL    | `now()`          |
| `deleted_at`               | timestamptz |             |                  |

### `store_currency`

<sub>7 columns · 56 kB</sub>

| Column          | Type        | Constraints  | Default |
| --------------- | ----------- | ------------ | ------- |
| `id`            | text        | PK           |         |
| `currency_code` | text        | NOT NULL     |         |
| `is_default`    | bool        | NOT NULL     | `false` |
| `store_id`      | text        | → `store.id` |         |
| `created_at`    | timestamptz | NOT NULL     | `now()` |
| `updated_at`    | timestamptz | NOT NULL     | `now()` |
| `deleted_at`    | timestamptz |              |         |

### `store_locale`

<sub>6 columns · 32 kB</sub>

| Column        | Type        | Constraints  | Default |
| ------------- | ----------- | ------------ | ------- |
| `id`          | text        | PK           |         |
| `locale_code` | text        | NOT NULL     |         |
| `store_id`    | text        | → `store.id` |         |
| `created_at`  | timestamptz | NOT NULL     | `now()` |
| `updated_at`  | timestamptz | NOT NULL     | `now()` |
| `deleted_at`  | timestamptz |              |         |

## Notification

Outbound notification log and providers.

### `notification`

<sub>19 columns · 96 kB</sub>

| Column                     | Type        | Constraints                  | Default     |
| -------------------------- | ----------- | ---------------------------- | ----------- |
| `id`                       | text        | PK                           |             |
| `to`                       | text        | NOT NULL                     |             |
| `channel`                  | text        | NOT NULL                     |             |
| `template`                 | text        |                              |             |
| `data`                     | jsonb       |                              |             |
| `trigger_type`             | text        |                              |             |
| `resource_id`              | text        |                              |             |
| `resource_type`            | text        |                              |             |
| `receiver_id`              | text        |                              |             |
| `original_notification_id` | text        |                              |             |
| `idempotency_key`          | text        |                              |             |
| `external_id`              | text        |                              |             |
| `provider_id`              | text        | → `notification_provider.id` |             |
| `created_at`               | timestamptz | NOT NULL                     | `now()`     |
| `updated_at`               | timestamptz | NOT NULL                     | `now()`     |
| `deleted_at`               | timestamptz |                              |             |
| `status`                   | text        | NOT NULL                     | `'pending'` |
| `from`                     | text        |                              |             |
| `provider_data`            | jsonb       |                              |             |

### `notification_provider`

<sub>8 columns · 48 kB</sub>

| Column       | Type        | Constraints | Default |
| ------------ | ----------- | ----------- | ------- |
| `id`         | text        | PK          |         |
| `handle`     | text        | NOT NULL    |         |
| `name`       | text        | NOT NULL    |         |
| `is_enabled` | bool        | NOT NULL    | `true`  |
| `channels`   | array       | NOT NULL    | `'{}'`  |
| `created_at` | timestamptz | NOT NULL    | `now()` |
| `updated_at` | timestamptz | NOT NULL    | `now()` |
| `deleted_at` | timestamptz |             |         |

## Region

Sales regions and their countries (US only).

### `region`

<sub>8 columns · 40 kB</sub>

| Column            | Type        | Constraints | Default |
| ----------------- | ----------- | ----------- | ------- |
| `id`              | text        | PK          |         |
| `name`            | text        | NOT NULL    |         |
| `currency_code`   | text        | NOT NULL    |         |
| `metadata`        | jsonb       |             |         |
| `created_at`      | timestamptz | NOT NULL    | `now()` |
| `updated_at`      | timestamptz | NOT NULL    | `now()` |
| `deleted_at`      | timestamptz |             |         |
| `automatic_taxes` | bool        | NOT NULL    | `true`  |

### `region_country`

<sub>10 columns · 120 kB</sub>

| Column         | Type        | Constraints   | Default |
| -------------- | ----------- | ------------- | ------- |
| `iso_2`        | text        | PK            |         |
| `iso_3`        | text        | NOT NULL      |         |
| `num_code`     | text        | NOT NULL      |         |
| `name`         | text        | NOT NULL      |         |
| `display_name` | text        | NOT NULL      |         |
| `region_id`    | text        | → `region.id` |         |
| `metadata`     | jsonb       |               |         |
| `created_at`   | timestamptz | NOT NULL      | `now()` |
| `updated_at`   | timestamptz | NOT NULL      | `now()` |
| `deleted_at`   | timestamptz |               |         |

## Stock location

Warehouses / stock locations.

### `stock_location`

<sub>7 columns · 56 kB</sub>

| Column       | Type        | Constraints                   | Default |
| ------------ | ----------- | ----------------------------- | ------- |
| `id`         | text        | PK                            |         |
| `created_at` | timestamptz | NOT NULL                      | `now()` |
| `updated_at` | timestamptz | NOT NULL                      | `now()` |
| `deleted_at` | timestamptz |                               |         |
| `name`       | text        | NOT NULL                      |         |
| `address_id` | text        | → `stock_location_address.id` |         |
| `metadata`   | jsonb       |                               |         |

### `stock_location_address`

<sub>13 columns · 40 kB</sub>

| Column         | Type        | Constraints | Default |
| -------------- | ----------- | ----------- | ------- |
| `id`           | text        | PK          |         |
| `created_at`   | timestamptz | NOT NULL    | `now()` |
| `updated_at`   | timestamptz | NOT NULL    | `now()` |
| `deleted_at`   | timestamptz |             |         |
| `address_1`    | text        | NOT NULL    |         |
| `address_2`    | text        |             |         |
| `company`      | text        |             |         |
| `city`         | text        |             |         |
| `country_code` | text        | NOT NULL    |         |
| `phone`        | text        |             |         |
| `province`     | text        |             |         |
| `postal_code`  | text        |             |         |
| `metadata`     | jsonb       |             |         |

## User

Admin users and invites.

### `invite`

<sub>9 columns · 40 kB</sub>

| Column       | Type        | Constraints | Default |
| ------------ | ----------- | ----------- | ------- |
| `id`         | text        | PK          |         |
| `email`      | text        | NOT NULL    |         |
| `accepted`   | bool        | NOT NULL    | `false` |
| `token`      | text        | NOT NULL    |         |
| `expires_at` | timestamptz | NOT NULL    |         |
| `metadata`   | jsonb       |             |         |
| `created_at` | timestamptz | NOT NULL    | `now()` |
| `updated_at` | timestamptz | NOT NULL    | `now()` |
| `deleted_at` | timestamptz |             |         |

### `user`

<sub>9 columns · 32 kB</sub>

| Column       | Type        | Constraints | Default |
| ------------ | ----------- | ----------- | ------- |
| `id`         | text        | PK          |         |
| `first_name` | text        |             |         |
| `last_name`  | text        |             |         |
| `email`      | text        | NOT NULL    |         |
| `avatar_url` | text        |             |         |
| `metadata`   | jsonb       |             |         |
| `created_at` | timestamptz | NOT NULL    | `now()` |
| `updated_at` | timestamptz | NOT NULL    | `now()` |
| `deleted_at` | timestamptz |             |         |

## API key

Publishable and secret API keys.

### `api_key`

<sub>13 columns · 112 kB</sub>

| Column         | Type        | Constraints | Default |
| -------------- | ----------- | ----------- | ------- |
| `id`           | text        | PK          |         |
| `token`        | text        | NOT NULL    |         |
| `salt`         | text        | NOT NULL    |         |
| `redacted`     | text        | NOT NULL    |         |
| `title`        | text        | NOT NULL    |         |
| `type`         | text        | NOT NULL    |         |
| `last_used_at` | timestamptz |             |         |
| `created_by`   | text        | NOT NULL    |         |
| `created_at`   | timestamptz | NOT NULL    | `now()` |
| `revoked_by`   | text        |             |         |
| `revoked_at`   | timestamptz |             |         |
| `updated_at`   | timestamptz | NOT NULL    | `now()` |
| `deleted_at`   | timestamptz |             |         |

## Currency

Currency reference data.

### `currency`

<sub>10 columns · 72 kB</sub>

| Column           | Type        | Constraints | Default |
| ---------------- | ----------- | ----------- | ------- |
| `code`           | text        | PK          |         |
| `symbol`         | text        | NOT NULL    |         |
| `symbol_native`  | text        | NOT NULL    |         |
| `decimal_digits` | int         | NOT NULL    | `0`     |
| `rounding`       | numeric     | NOT NULL    | `0`     |
| `raw_rounding`   | jsonb       | NOT NULL    |         |
| `name`           | text        | NOT NULL    |         |
| `created_at`     | timestamptz | NOT NULL    | `now()` |
| `updated_at`     | timestamptz | NOT NULL    | `now()` |
| `deleted_at`     | timestamptz |             |         |

## Custom - audit log

Append-only HIPAA audit trail. IDs only - no PHI.

### `audit_log`

<sub>10 columns · 48 kB</sub>

| Column       | Type        | Constraints | Default |
| ------------ | ----------- | ----------- | ------- |
| `id`         | text        | PK          |         |
| `actor_id`   | text        |             |         |
| `actor_type` | text        | NOT NULL    |         |
| `action`     | text        | NOT NULL    |         |
| `entity`     | text        | NOT NULL    |         |
| `entity_id`  | text        |             |         |
| `metadata`   | jsonb       |             |         |
| `created_at` | timestamptz | NOT NULL    | `now()` |
| `updated_at` | timestamptz | NOT NULL    | `now()` |
| `deleted_at` | timestamptz |             |         |

## Custom - product reviews

Reviews with a mandatory moderation gate.

### `product_review`

<sub>14 columns · 40 kB</sub>

| Column              | Type        | Constraints | Default               |
| ------------------- | ----------- | ----------- | --------------------- |
| `id`                | text        | PK          |                       |
| `product_id`        | text        | NOT NULL    |                       |
| `customer_id`       | text        |             |                       |
| `display_name`      | text        | NOT NULL    | `'Verified Customer'` |
| `rating`            | int         | NOT NULL    |                       |
| `title`             | text        |             |                       |
| `content`           | text        | NOT NULL    |                       |
| `verified_purchase` | bool        | NOT NULL    | `false`               |
| `status`            | text        | NOT NULL    | `'pending'`           |
| `moderated_by`      | text        |             |                       |
| `moderated_at`      | text        |             |                       |
| `created_at`        | timestamptz | NOT NULL    | `now()`               |
| `updated_at`        | timestamptz | NOT NULL    | `now()`               |
| `deleted_at`        | timestamptz |             |                       |

## Sales channel

Sales channels.

### `sales_channel`

<sub>8 columns · 48 kB</sub>

| Column        | Type        | Constraints | Default |
| ------------- | ----------- | ----------- | ------- |
| `id`          | text        | PK          |         |
| `name`        | text        | NOT NULL    |         |
| `description` | text        |             |         |
| `is_disabled` | bool        | NOT NULL    | `false` |
| `metadata`    | jsonb       |             |         |
| `created_at`  | timestamptz | NOT NULL    | `now()` |
| `updated_at`  | timestamptz | NOT NULL    | `now()` |
| `deleted_at`  | timestamptz |             |         |
