import json
import base64
import os
import boto3
import pymongo 
from datetime import datetime, timedelta, timezone
from bson import Binary
import base64

# Configuración de MongoDB
MONGO_URI =os.environ.get("MONGO_URI")
DATABASE_NAME = os.environ.get("BD_NAME") 
COLLECTION_RECORDS = os.environ.get("COLLECTION_RECORDS")
# Conectar a MongoDB
# client = pymongo.MongoClient(MONGO_URI)
# db = client[DATABASE_NAME] 

client = None

def get_collection():
    global client
    if client is None:
        client = pymongo.MongoClient(MONGO_URI)
    db = client[DATABASE_NAME]
    return db[COLLECTION_RECORDS]

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
        print(f"COLLECTION_RECORDS={COLLECTION_RECORDS}")
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
        
        fecha_limite = datetime.now(timezone.utc) - timedelta(days=30)
        _collection = get_collection()
        # records = list(_collection.find({"created_at":{"$gte":fecha_limite}}, {"_id": 0}) )
        records = list(_collection.find({}, {"_id": 0}) )

        records = [convert_datetime_to_str(record) for record in records]
        print(records)
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,GET",
                "Access-Control-Allow-Headers": "Content-Type,Authorization"
            },
            "body": json.dumps(records)
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
