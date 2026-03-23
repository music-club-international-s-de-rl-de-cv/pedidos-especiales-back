import json
import os
import pymongo

# Configuración de MongoDB
MONGO_URI = os.environ.get("MONGO_URI")
DATABASE_NAME = os.environ.get("BD_NAME")
COLLECTION_ORDERS = os.environ.get("COLLECTION_ORDERS")

# Conectar a MongoDB
client = pymongo.MongoClient(MONGO_URI)
db = client[DATABASE_NAME]
collection_orders = db[COLLECTION_ORDERS]


def lambda_handler(event, context):
    try:
        # CORS preflight
        if event["httpMethod"] == "OPTIONS":
            return {
                "statusCode": 200,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST",
                    "Access-Control-Allow-Headers": "Content-Type,Authorization"
                },
                "body": ""
            }

        # Validar método POST
        if event["httpMethod"] != "POST":
            return {
                "statusCode": 405,
                "body": json.dumps({"error": "Método no permitido"})
            }

        # Obtener body
        body = json.loads(event.get("body", "{}"))

        # Insertar múltiples órdenes
        if isinstance(body, list):
            result = collection_orders.insert_many(body)

            return {
                "statusCode": 200,
                "headers": {
                    "Access-Control-Allow-Origin": "*"
                },
                "body": json.dumps({
                    "message": "Órdenes guardadas",
                    "insertedIds": [str(_id) for _id in result.inserted_ids]
                })
            }

        # Insertar una sola orden
        elif isinstance(body, dict):
            result = collection_orders.insert_one(body)

            return {
                "statusCode": 200,
                "headers": {
                    "Access-Control-Allow-Origin": "*"
                },
                "body": json.dumps({
                    "message": "Orden guardada",
                    "insertedId": str(result.inserted_id)
                })
            }

        else:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Formato inválido"})
            }

    except Exception as e:
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({"error": str(e)})
        }