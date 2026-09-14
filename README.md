# Proventeq Drop — Blob Storage POC

A browser-only "drop a file, share a link" front end for **Azure Blob Storage**.
There is **no backend**: the SPA signs the user in with Entra ID and calls Blob
Storage directly with a **delegated** token (`https://storage.azure.com/user_impersonation`).
Entra RBAC on the storage account decides what each user may do.

- **Drop** files anywhere on the page (or browse) → uploaded to `<container>/<user-object-id>/<file>`
  with progress and Dropbox-style name de-duplication (`report (1).pdf`).
- **Share** → a read-only **user delegation SAS** link (1 hour / 1 day / 7 days).
  Recipients need no account; the link forces a download with the original name.
- **Download / delete** your own files.
- **Activity** and **Shared links** panels, fed by a **mock audit service**.

Stack mirrors `365-overview`: React 19 · TypeScript · Vite 8 · Tailwind v4 ·
shadcn (Base UI) · MSAL redirect flow · TanStack Query · `@azure/storage-blob`.

---

## Run it

```bash
npm install
npm run dev:mock      # mock mode — in-memory files, no Azure needed
```

Live mode:

```bash
cp .env.example .env  # fill in the values (see Azure setup below)
npm run dev
```

Checks: `npm run typecheck` · `npm run test` · `npm run lint` · `npm run build`.

---

## Azure setup (live mode)

### 1. Storage account + container

Any StorageV2 account. Create the container (default name `drop`). Leave
anonymous blob access **disabled** — nothing here needs it.

### 2. CORS on the Blob service

The browser calls Storage cross-origin, so the Blob service needs a CORS rule.
Portal → storage account → **Resource sharing (CORS)** → **Blob service**:

| Allowed origins | Allowed methods | Allowed headers | Exposed headers | Max age |
|---|---|---|---|---|
| `http://localhost:5173` (+ your deployed origin) | `GET, PUT, DELETE, HEAD, OPTIONS, POST` | `*` | `*` | `3600` |

`POST` is needed for **Get User Delegation Key**. Missing CORS shows up in the app
as *"Could not reach Azure Storage"* (the browser hides the real error).

### 3. Entra app registration

- **Platform:** Single-page application, redirect URI `http://localhost:5173/`.
- **API permissions:** *Azure Storage* → **Delegated** → `user_impersonation`.
  Grant admin consent if your tenant requires it.
- Put the client ID and `https://login.microsoftonline.com/<tenant-id>` in `.env`.

### 4. RBAC for users (assign to a group)

| Role | Scope | Why |
|---|---|---|
| **Storage Blob Data Contributor** | the container | list / upload / download / delete |
| **Storage Blob Delegator** | the **storage account** | create share links |

The second role matters: *Get User Delegation Key* is an account-level
operation, so Azure only honours its permission when the role is assigned at
the storage account, resource group or subscription — not at container scope.

```bash
SCOPE_ACCOUNT=/subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.Storage/storageAccounts/<account>
az role assignment create --role "Storage Blob Data Contributor" --assignee <group-object-id> \
  --scope "$SCOPE_ACCOUNT/blobServices/default/containers/drop"
az role assignment create --role "Storage Blob Delegator" --assignee <group-object-id> \
  --scope "$SCOPE_ACCOUNT"
```

Role assignments can take a few minutes to take effect.

---

## How sharing works without a backend

1. The app calls `getUserDelegationKey` with the user's token. The key is cached
   and valid for up to 7 days.
2. It signs a SAS for that one blob: `sp=r`, `sr=b`, `spr=https`, an expiry, and
   `rscd=attachment; filename=…`.
3. Anyone with the URL can `GET` the blob until it expires. At request time
   Storage also checks that the user who issued the key **still** has read
   access.

**Browser signing:** `@azure/storage-blob`'s browser build refuses to sign
user delegation SAS (its HMAC is Node-only). `src/storage/userDelegationSas.ts`
builds the string-to-sign for service version `2020-12-06` and signs with
WebCrypto. A unit test compares the result with the SDK's Node signer.

---

## Architecture

```
src/
  auth/        MSAL redirect login + token acquisition (ported from 365-overview)
  config/      VITE_* parsing (env.ts: mock flag, appConfig.ts: live config)
  storage/     StorageService interface
               live.ts   Blob SDK + delegated token + browser SAS signing
               mock.ts   in-memory implementation for mock mode / tests
               paths.ts  per-user prefix, file name sanitising, de-duplication
               errors.ts 403 / 404 / CORS → actionable messages
  audit/       AuditService interface (the future backend seam)
               mock.ts           localStorage log
               auditedStorage.ts decorator: records upload/delete/download/share
  services/    React context wiring mock vs live services
  hooks/       TanStack Query hooks + upload tray state — the UI's only data entry point
  components/  DropZone, UploadTray, FileList, ShareDialog, SidePanels, ui/ (shadcn)
```

---

## POC limitations (what the real product fixes with a backend)

| POC | Full product |
|---|---|
| **No per-link revocation.** A user delegation SAS can't use a stored access policy. The only ways to stop a link: delete the file, remove the issuer's RBAC, or revoke *all* delegation keys on the account (`az storage account revoke-delegation-keys`). | Links go through a backend or proxy that can revoke, cap downloads, add passwords and log each access. |
| **Per-user folders are enforced by the UI only.** RBAC applies to the whole container, so a user with the right tools can read other users' folders. | ABAC conditions on the role assignment (blob path starts with `@Principal[oid]`), or per-user containers created by the backend. |
| **Audit log is in localStorage.** The user can edit it, and the UI keeps share URLs in it. | Append-only server-side audit, correlated with Storage diagnostic logs. Link IDs stored, never signed URLs. |
| Share list is only on this browser. | Share records in the backend, visible on every device. |
| No malware scan, quotas, or file type policy. | Defender for Storage, plus quotas and policy enforced by the backend. |
