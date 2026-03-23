import json
import base64
import os
import pymongo
from datetime import datetime
from bson import Binary

# Solo lees las variables aquí, NO conectas
MONGO_URI = os.environ.get("MONGO_URI")
DATABASE_NAME = os.environ.get("BD_NAME")
COLLECTION_ORDERS = os.environ.get("COLLECTION_ORDERS")

# Variable global para reutilizar la conexión (patrón recomendado en Lambda)
client = None

def get_collection():
    global client
    if client is None:
        client = pymongo.MongoClient(MONGO_URI)
    db = client[DATABASE_NAME]
    return db[COLLECTION_ORDERS]

def convert_datetime_to_str(document):
    if isinstance(document, dict):
        return {key: convert_datetime_to_str(value) for key, value in document.items()}
    elif isinstance(document, list):
        return [convert_datetime_to_str(item) for item in document]
    elif isinstance(document, datetime):
        return document.isoformat()
    elif isinstance(document, Binary):
        return base64.b64encode(document).decode("utf-8")
    return document

def lambda_handler(event, context):
    try:
        print(f"MONGO_URI={MONGO_URI}")
        print(f"DATABASE_NAME={DATABASE_NAME}")
        print(f"COLLECTION_ORDERS={COLLECTION_ORDERS}")
        if event["httpMethod"] == "OPTIONS":
            return {
                "statusCode": 200,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,GET",
                    "Access-Control-Allow-Headers": "Content-Type,Authorization"
                },
                "body": ""
            }

        query_params = event.get("queryStringParameters") or {}
        order_number = query_params.get("order_number")

        if not order_number:
            return {
                "statusCode": 400,
                "headers": {"Access-Control-Allow-Origin": "*"},
                "body": json.dumps({"error": "order_number es requerido"})
            }

        collection = get_collection()
        products = list(collection.find({"order_number": order_number}, {"_id": 0}))
        print(f'order_number={order_number}')
        print(f'products={products}')
        if not products:
            try:
                products = list(collection.find({"order_number": int(order_number)}, {"_id": 0}))
            except ValueError:
                pass
        print(f'products encontrados: {len(products)}')
        products = [convert_datetime_to_str(product) for product in products]

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,GET",
                "Access-Control-Allow-Headers": "Content-Type,Authorization"
            },
            "body": json.dumps(products)
        }
    except Exception as e:
        print(f"error = {e}")
        return {
            "statusCode": 500,
            "headers": {"Access-Control-Allow-Origin": "*"},
            "body": json.dumps({"error": str(e)})
        }