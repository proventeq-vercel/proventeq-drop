#!/usr/bin/env bash
# One-user setup for Proventeq Drop. Needs: az CLI (logged in as an admin who can
# create resources, assign roles and edit the app registration) + jq.
set -euo pipefail

# ---- edit these ------------------------------------------------------------
SUB="<subscription-id>"
RG="rg-proventeq-drop"
LOCATION="westeurope"
ACCOUNT="proventeqdrop$RANDOM"             # globally unique, 3-24 lowercase alnum
CONTAINER="drop"
APP_ID="a6036483-bd4e-44d4-896f-33d6547eb66d" # existing SPA app registration
USER_UPN="gov360.automation@proventeqe5.onmicrosoft.com"            # the one POC user
ORIGINS=("http://localhost:5173" "https://proventeq-drop.vercel.app")
# ----------------------------------------------------------------------------

az account set --subscription "$SUB"
TENANT=$(az account show --query tenantId -o tsv)

echo "1/5 Storage account + container"
az group create -n "$RG" -l "$LOCATION" -o none
az storage account create -n "$ACCOUNT" -g "$RG" -l "$LOCATION" \
  --sku Standard_LRS --kind StorageV2 --min-tls-version TLS1_2 \
  --allow-blob-public-access false -o none
az storage container-rm create --storage-account "$ACCOUNT" -g "$RG" -n "$CONTAINER" -o none
ACC_ID=$(az storage account show -n "$ACCOUNT" -g "$RG" --query id -o tsv)

echo "2/5 CORS on the Blob service"
CORS_ORIGINS=$(printf '%s\n' "${ORIGINS[@]}" | jq -R . | jq -sc .)
az rest --method put --uri "https://management.azure.com$ACC_ID/blobServices/default?api-version=2023-05-01" \
  --body "{\"properties\":{\"cors\":{\"corsRules\":[{\"allowedOrigins\":$CORS_ORIGINS,\"allowedMethods\":[\"GET\",\"PUT\",\"DELETE\",\"HEAD\",\"OPTIONS\",\"POST\"],\"allowedHeaders\":[\"*\"],\"exposedHeaders\":[\"*\"],\"maxAgeInSeconds\":3600}]}}}" -o none

echo "3/5 App registration: SPA redirect URIs + Azure Storage user_impersonation"
REDIRECTS=$(az ad app show --id "$APP_ID" --query "spa.redirectUris" -o json \
  | jq -c --argjson add "$(printf '%s/\n' "${ORIGINS[@]}" | jq -R . | jq -s .)" '(. // []) + $add | unique')
az rest --method patch --uri "https://graph.microsoft.com/v1.0/applications(appId='$APP_ID')" \
  --headers "Content-Type=application/json" --body "{\"spa\":{\"redirectUris\":$REDIRECTS}}"
# Azure Storage API (e406a681-...) / user_impersonation scope (03e0da56-...)
az ad app permission add --id "$APP_ID" --api e406a681-f3d4-42a8-90b6-c2b029497af1 \
  --api-permissions 03e0da56-190b-40ad-a80c-ea378c433f7f=Scope 2>/dev/null || true
az ad app permission admin-consent --id "$APP_ID"

echo "4/5 Roles for $USER_UPN"
USER_OID=$(az ad user show --id "$USER_UPN" --query id -o tsv)
az role assignment create --assignee-object-id "$USER_OID" --assignee-principal-type User \
  --role "Storage Blob Data Contributor" --scope "$ACC_ID/blobServices/default/containers/$CONTAINER" -o none
az role assignment create --assignee-object-id "$USER_OID" --assignee-principal-type User \
  --role "Storage Blob Delegator" --scope "$ACC_ID" -o none

echo "5/5 Done. Env vars (Vercel / .env):"
cat <<EOF

VITE_USE_MOCK=false
VITE_CLIENT_ID=$APP_ID
VITE_AUTHORITY_URI=https://login.microsoftonline.com/$TENANT
VITE_REDIRECT_URI=${ORIGINS[1]}/
VITE_STORAGE_ACCOUNT=$ACCOUNT
VITE_CONTAINER=$CONTAINER

Role assignments can take ~5 minutes to apply.
EOF
