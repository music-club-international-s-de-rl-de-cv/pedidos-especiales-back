param(
  [string]$envName
)

$envFile = ".env.$envName"

if (-Not (Test-Path $envFile)) {
  Write-Host "No se encontró el archivo $envFile"
  exit 1
}

# Cargar las variables de entorno
Get-Content $envFile | ForEach-Object {
  if ($_ -match "^\s*([^#=]+?)\s*=\s*(.+)$") {
    $key = $matches[1].Trim()
    $value = $matches[2].Trim()

    # Elimina comillas solo si están al principio y al final del valor
    if ($value.StartsWith('"') -and $value.EndsWith('"')) {
      $value = $value.Trim('"')
    }

    [System.Environment]::SetEnvironmentVariable($key, $value)
  }
}

sam deploy `
  --config-file "samconfig.$envName.toml" `
  --config-env $envName `
  --parameter-overrides `
    Environment=$envName `
    DBUri=$env:DB_URI `
    DBName=$env:DB_NAME `
    CollectionResponse=$env:COLLECTION_RESPONSE `
    CollectionOrders=$env:COLLECTION_ORDERS `
    DevEnv=$env:DEVELOP_ENV `
    ApiKeyDevEpicor=$env:API_KEY_DEV_EPICOR `
    AuthDevEpicor=$env:AUTH_DEV_EPICOR `
    UriDevEpicor=$env:URI_DEV_EPICOR `
    ApiKeyProdEpicor=$env:API_KEY_PROD_EPICOR `
    UriProdEpicor=$env:URI_PROD_EPICOR `
    AuthGetDescSp=$env:AUTH_GET_DESC_SP `
    SqlServer=$env:SQL_SERVER `
    SqlUser=$env:SQL_USER `
    SqlPass=$env:SQL_PASS `
    SqlDb=$env:SQL_DB `
    SqlDbPrueba=$env:SQL_DB_PRUEBA `
    CollectionRecords=$env:COLLECTION_RECORDS `
    CollectionWebhook=$env:COLLECTION_WEBHOOK `
    apiUrlBase115=$env:API_115_URL_BASE `
    CollectionB2BProduct=$env:COLLECTION_B2B_PRODUCT `
    CollectionB2BPrice=$env:COLLECTION_B2B_PRICES `
    CollectionB2BProcess=$env:COLLECTION_B2B_PROCESS `
    HostNameShopifyDev=$env:HOSTNAME_SHOPIFY_DEV `
    AccessTokenShopifyDev=$env:ACCESSTOKEN_SHOPIFY_DEV