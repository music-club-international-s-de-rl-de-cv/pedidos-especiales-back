import json
import base64
import os
import boto3
import pymongo
from datetime import datetime
from bson import Binary
import base64

# Configuración de MongoDB
MONGO_URI =os.environ.get("MONGO_URI")
DATABASE_NAME = os.environ.get("BD_NAME")
COLLECTION_ORDERS = os.environ.get("COLLECTION_ORDERS")

# Conectar a MongoDB
client = pymongo.MongoClient(MONGO_URI)
db = client[DATABASE_NAME]
collection_orders = db[COLLECTION_ORDERS]


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

        # Obtener todos los procesos
        orders = list(
            collection_orders.find({}, {"_id": 0})
            .sort("paidAt", -1)  # 🔥 DESCENDENTE
        )

        # Convertir los campos datetime a string ISO 8601
        orders = [convert_datetime_to_str(order) for order in orders]

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,GET",
                "Access-Control-Allow-Headers": "Content-Type,Authorization"
            },
            "body": json.dumps(orders)
        }

    except Exception as e:
        print(f"error = {e}")
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,GET",
                "Access-Control-Allow-Headers": "Content-Type,Authorization"
            },
            "body": json.dumps({"error": str(e)})
        }
