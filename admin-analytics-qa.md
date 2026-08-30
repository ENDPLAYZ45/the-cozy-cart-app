# Admin Workflow and First-Party Analytics QA

## Product management workflow

The **Add product** and per-row **Edit product** actions now open an on-screen modal, preserving the catalog table position. The form uses a required controlled category dropdown with Automotive, Electronics, Home & Kitchen, Office Supplies, Pet Supplies, Sports & Fitness, and Toys & Games. Automated coverage opens both dialog modes and verifies all category options.

## First-party analytics

The new `analytics_events` table stores anonymous opaque visitor/session IDs, route, event type, optional category, optional bounded search term, and timestamp; it does not store customer email, IP address, or user-agent. A live database check after public-route review confirmed persisted events and distinct visitor/session aggregates. The admin dashboard calculates recent viewers (five-minute window), unique viewers, return rate, total visits, top search, top category, and ranked category interest directly from this table.

## Responsive review and safeguards

Desktop and mobile storefront checks confirmed the added tracking does not affect public layout. The admin login is still credential-safe; analytics summaries require a verified Firebase administrator token. The full suite passed 30 tests, TypeScript checking, and a production build.
