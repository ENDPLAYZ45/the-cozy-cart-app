# Real Analytics Correction QA

## Issue found

The initial preview dashboard was correctly calculating from the analytics table, but that table contained events generated during local preview review. Those sessions were not customer traffic and could therefore make the dashboard appear to show invented business metrics.

## Correction

Preview builds now do not record analytics events. The development-only rows were removed from the newly created analytics table, and the table was verified empty afterward. The authenticated dashboard now shows an explicit **No verified production traffic yet** state rather than numeric cards when there is no published-site traffic.

## Real-data behavior

After the site is published, only real production visits record anonymous first-party page views, searches, and category selections. All dashboard values—recent viewers, unique viewers, return rate, visits, top search, top category, and category interest—are calculated from those persisted events. The authenticated Add and Edit product modals and controlled category selector were also reviewed without changing catalog data.
