import json
import os
import pymongo
import boto3

# lambda_client = boto3.client("lambda")
lambda_client = boto3.client("lambda", region_name="us-east-1")

# Configuración de MongoDB
MONGO_URI = os.environ.get("MONGO_URI")
DATABASE_NAME = os.environ.get("BD_NAME")
COLLECTION_ORDERS = os.environ.get("COLLECTION_ORDERS")

# Conectar a MongoDB
client = pymongo.MongoClient(MONGO_URI)
db = client[DATABASE_NAME]
collection_orders = db[COLLECTION_ORDERS]

environment = os.getenv("ENVIRONMENT", "dev")
function_name = f"OrderEpicor-{environment}"


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
            print('body__list')
            result = collection_orders.insert_many(body)
            for _body in body:
                _body.pop("_id", None) 
                lambda_client.invoke(
                    FunctionName=function_name,  
                    InvocationType="Event",
                    Payload=json.dumps({"order": _body})
                )

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
            print('body__dict')
            result = collection_orders.insert_one(body)
            body.pop("_id", None)
            try:
                lambda_client.invoke(
                    FunctionName=function_name,  
                    InvocationType="Event",
                    Payload=json.dumps({"order": body})
                )
                
            except Exception as invoke_error:
                print(f"ERROR AL INVOCAR: {str(invoke_error)}")
                bodyEpicor = {"ov_epicor": "", "internal_state": False}
          
            # if bodyEpicor.get("internal_state", 0) == True:
            #     ordersComplet.append(order_data)
            # else:
            #     ordersFail.append(order_data)
            # 
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
        print(f"error = {e}")
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({"error": str(e)})
        }