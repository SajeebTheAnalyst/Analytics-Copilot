# Firestore Security Specification

## Data Invariants
1. All resources (datasets, dashboards, suggestions) must belong to a valid user.
2. Users can only read and write their own data.
3. User profiles are only accessible by the owner.

## The Dirty Dozen Payloads

1. **Identity Spoofing**: Attempt to create a dashboard with a `userId` that is not the authenticated user's UID.
2. **Cross-User Read**: Authenticated User A attempts to read User B's dashboard.
3. **Ghost Field Injection**: Attempt to add an `isAdmin: true` field to a user profile.
4. **Invalid ID**: Attempt to use a 2KB string as a `datasetId`.
5. **Unauthorized Deletion**: User A attempts to delete User B's dataset.
6. **Bypassing Verification**: User with `email_verified: false` attempts to write data (if restricted).
7. **Size Attack**: Attempt to write a dataset name that is 10,000 characters long.
8. **Malicious Enum**: Attempt to set `status` in a suggestion to `deleted` if not in the allowed list.
9. **Type Poisoning**: Attempt to set `rowCount` to a string instead of an integer.
10. **Timestamp Manipulation**: Attempt to set `createdAt` to a future date instead of `request.time`.
11. **Orphaned Writes**: Attempt to create a suggestion for a dataset that doesn't exist (using `exists()` check).
12. **Blanket Read Attempt**: Attempting to list ALL dashboards across all users.

## Test Runner
(Tests would be implemented in `firestore.rules.test.ts` if environment supported it)
