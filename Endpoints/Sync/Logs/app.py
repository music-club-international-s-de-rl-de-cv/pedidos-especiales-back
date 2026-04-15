import json
import os
import pymongo
import base64
from datetime import datetime
from bson import Binary

# ================================
# 🔧 VARIABLES DE ENTORNO
# ================================
MONGO_URI = os.environ.get("MONGO_URI")
DATABASE_NAME = os.environ.get("BD_NAME")
COLLECTION_NAME = os.environ.get("COLLECTION_B2B_PROCESS") 

# ================================
# 🔌 CONEXIÓN A MONGO
# ================================
client = pymongo.MongoClient(MONGO_URI)
db = client[DATABASE_NAME]
collection_orders = db[COLLECTION_NAME]

# ================================
# 🔄 UTIL: CONVERTIR DATOS
# ================================
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

# ================================
# 🚀 HANDLER
# ================================
def lambda_handler(event, context):
    try:

        # ================================
        # 🌐 CORS (IMPORTANTE)
        # ================================
        if event.get("httpMethod") == "OPTIONS":
            return {
                "statusCode": 200,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,GET",
                    "Access-Control-Allow-Headers": "Content-Type,Authorization"
                },
                "body": ""
            }

        # ================================
        # 📥 QUERY PARAM
        # ================================
        params = event.get("queryStringParameters") or {}
        task_name = params.get("taskName")

        if not task_name:
            return {
                "statusCode": 400,
                "headers": {
                    "Access-Control-Allow-Origin": "*"
                },
                "body": json.dumps({
                    "error": "taskName es requerido (PRICE | STOCK)"
                })
            }

        # ================================
        # 🔥 PIPELINE MONGO
        # ================================
        pipeline = [
            {
                "$match": {
                    "taskName": task_name.upper()  # por si viene en minúsculas
                }
            },
            {
                "$addFields": {
                    "createdAtDate": {
                        "$dateFromString": {
                            "dateString": "$createdAt",
                            "format": "%Y-%m-%d %H:%M:%S"
                        }
                    }
                }
            },
            {
                "$sort": {
                    "createdAtDate": -1
                }
            },
            {
                "$limit": 5
            },
            {
                "$project": {
                    "_id": 0,
                    "createdAtDate": 0
                }
            }
        ]

        results = list(collection_orders.aggregate(pipeline))

        # ================================
        # 🔄 NORMALIZAR DATOS
        # ================================
        results = [convert_datetime_to_str(r) for r in results]

        # ================================
        # ✅ RESPONSE
        # ================================
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,GET",
                "Access-Control-Allow-Headers": "Content-Type,Authorization"
            },
            "body": json.dumps({
                "ok": True,
                "data": results
            })
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
            "body": json.dumps({
                "ok": False,
                "error": str(e)
            })
        }