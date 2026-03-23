import json
import base64
import os
import boto3
import pymongo 
from datetime import datetime, timedelta
from bson import Binary
import base64

# Configuración de MongoDB
MONGO_URI =os.environ.get("MONGO_URI")
DATABASE_NAME = os.environ.get("BD_NAME")
COLLECTION_WEBHOOK = os.environ.get("COLLECTION_WEBHOOK")

# Conectar a MongoDB
# client = pymongo.MongoClient(MONGO_URI)
# db = client[DATABASE_NAME]
# collection_webhook = db[COLLECTION_WEBHOOK]

client = None

def get_collection():
    global client
    if client is None:
        client = pymongo.MongoClient(MONGO_URI)
    db = client[DATABASE_NAME]
    return db[COLLECTION_WEBHOOK]

def convert_datetime_to_str(document):
    """Convierte recursivamente los campos datetime a string ISO 8601."""
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
        print(f"DATABASE_NAME={DATABASE_NAME}")
        print(f"COLLECTION_WEBHOOK={COLLECTION_WEBHOOK}")
        print(f"MONGO_URI={'SET' if MONGO_URI else 'NONE'}")
        # Manejo de solicitudes OPTIONS para CORS
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
        
        _data = []
        # filterdata = event["pathParameters"]["filterdata"]
        query_params = event.get("queryStringParameters") or {}
        filterdata = query_params.get("filterdata")

        # if not filterdata:
        #     return {
        #         "statusCode": 400,
        #         "headers": {"Access-Control-Allow-Origin": "*"},
        #         "body": json.dumps({"error": "filterdata es requerido"})
        #     }
        # ✅ Corregido
        fecha_limite = datetime.utcnow() - timedelta(days=30)  # define primero
        _collection = get_collection()
        if filterdata is None or filterdata.strip() == "":
           
            # _data = _collection.find({"created_at": {"$gte": fecha_limite}}, {"_id": 0})
            _data = _collection.find({}, {"_id": 0}).limit(10)
        else:
            # _data = _collection.find({"created_at": {"$gte": fecha_limite}, "order_number": filterdata}, {"_id": 0})
            _data = _collection.find({}, {"_id": 0}).limit(10)

        _data = [convert_datetime_to_str(data) for data in _data]
        print(_data)
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,GET",
                "Access-Control-Allow-Headers": "Content-Type,Authorization"
            },
            "body": json.dumps(_data)
        }

    except Exception as e:
        print(f"ERROR = {e}") 
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,GET",
                "Access-Control-Allow-Headers": "Content-Type,Authorization"
            },
            "body": json.dumps({"error": str(e)})
        }
