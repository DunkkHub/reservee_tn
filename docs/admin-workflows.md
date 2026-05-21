# Admin Workflows

## Main responsibilities

Admins are expected to:

- review pending or changed business profiles
- approve, feature, suspend, or archive businesses
- leave internal moderation notes
- leave business-facing moderation messages when needed
- review platform-wide booking and activity data

## Moderation flow

1. Open the admin surface.
2. Filter businesses by moderation status, city, or category.
3. Review profile completeness, trust markers, services, media, and policies.
4. Apply one of the allowed statuses:
   - `approved`
   - `featured`
   - `changes_requested`
   - `suspended`
   - `archived`
5. Add internal notes and optional business-facing guidance.

## Auditability

- Business moderation changes are persisted in `moderation_history`
- High-level actions are also written to `activity_logs`

## Operational cautions

- Feature ranking should be deliberate, not random
- Suspensions and archives should be reversible through explicit review
- Production moderation should be limited to trusted admin accounts only
