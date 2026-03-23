#!/bin/bash

ENV_FILE=".env.$1"
ENV_NAME="$1"

if [ ! -f "$ENV_FILE" ]; then
  echo "No se encontró el archivo $ENV_FILE"
  exit 1
fi

# Leer variables de entorno
set -a
source "$ENV_FILE"
set +a

sam deploy \
  --config-file samconfig.$ENV_NAME.toml \
  --config-env $ENV_NAME \
  --parameter-overrides \
    Environment=$ENV_NAME \
    DBUri=$DB_URI \
    DBName=$DB_NAME \
    CollectionResponse=$COLLECTION_RESPONSE \
    CollectionOrders=$COLLECTON_ORDERS \
    DevEnv=$DEVELOP_ENV \
    ApiKeyDevEpicor=$API_KEY_DEV_EPICOR \
    AuthDevEpicor=$AUTH_DEV_EPICOR \
    UriDevEpicor=$URI_DEV_EPICOR \
    ApiKeyProdEpicor=$API_KEY_PROD_EPICOR \
    UriProdEpicor=$URI_PROD_EPICOR \
    AuthGetDescSp=$AUTH_GET_DESC_SP \
    SqlServer=$SQL_SERVER \
    SqlUser=$SQL_USER \
    SqlPass=$SQL_PASS \
    SqlDb=$SQL_DB \
    SqlDbPrueba=$SQL_DB_PRUEBA \
    CollectionRecords=$COLLECTION_RECORDS \
    CollectionWebhook=$COLLECTION_WEBHOOK \