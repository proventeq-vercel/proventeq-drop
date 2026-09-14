# Proventeq Drop: Blob Storage POC design

**Date:** 2026-09-14 · **Status:** implemented (POC)

## Goal

Build a Dropbox-style front end for Azure Blob Storage: drop a file, share a
link. It uses **delegated permissions only**, so there is no backend. Auditing,
logging and the backend are mocked behind interfaces so the full product can
replace them.

## Decisions

| Question | Decision | Why |
|---|---|---|
| Share model | **User delegation SAS**: read-only, one blob, HTTPS only, expiry of 1 hour, 1 day or 7 days | Works with the user's own token and needs no account key. Recipients don't need an account. |
| Layout | One container, `<container>/<user-oid>/<file>` | Gives each user "My files". Separation is in the UI only (see limitations). |
| Stack | Same as `365-overview` (React 19, Vite, Tailwind v4, shadcn/Base UI, MSAL redirect, `VITE_USE_MOCK`) | Consistent with the existing Proventeq SPA. |
| SAS signing | Built by hand for version `2020-12-06`, signed with WebCrypto | The SDK's browser build refuses to sign user delegation SAS. A test checks our output against the SDK's Node signer. |
| Auditing | `withAudit(storage, audit)` decorator over a `StorageService`; `AuditService` mock writes to localStorage | Keeps auditing out of the UI, and gives the backend one place to plug in. |

## Azure prerequisites

- **CORS** on the Blob service, allowing GET, PUT, DELETE, HEAD, OPTIONS and POST.
- An SPA app registration with the delegated **Azure Storage `user_impersonation`** permission.
- **Storage Blob Data Contributor** on the container.
- **Storage Blob Delegator** on the storage account. Get User Delegation Key is an
  account-level operation, so a role at container scope is not enough.

## Known limitations

See the README section "POC limitations". In short:

- Links can't be revoked one at a time.
- Per-user separation is in the UI only; ABAC conditions would enforce it.
- The audit log is stored client-side and can be edited.
