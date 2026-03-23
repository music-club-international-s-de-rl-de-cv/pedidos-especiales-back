import json
import base64
import os
import boto3
import pymongo 
from datetime import datetime, timedelta
import uuid
from bson import Binary
import base64

# Lambda
lambda_client = boto3.client("lambda")

# Configuración de MongoDB
MONGO_URI =os.environ.get("MONGO_URI")
DATABASE_NAME = os.environ.get("BD_NAME")
COLLECTION_ORDERS = os.environ.get("COLLECTION_ORDERS")
COLLECTION_WEBHOOK = os.environ.get("COLLECTION_WEBHOOK")
COLLECTION_RECORDS = os.environ.get("COLLECTION_RECORDS")

environment = os.getenv("ENVIRONMENT", "dev")
function_name = f"OrderEpicor-{environment}"

# Conectar a MongoDB
client = None

def get_collection(DataBaseName):
    global client
    if client is None:
        client = pymongo.MongoClient(MONGO_URI)
    db = client[DATABASE_NAME]
    return db[DataBaseName]
 


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
        if event["httpMethod"] == "OPTIONS":
            return {
                "statusCode": 200,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
                    "Access-Control-Allow-Headers": "Content-Type,Authorization"
                },
                "body": ""
            }
        if "body" not in event or not event["body"]:
            return {
                "statusCode": 400,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
                    "Access-Control-Allow-Headers": "Content-Type,Authorization"
                },
                "body": json.dumps({"error": "No se envió un archivo"})
            }
        body = json.loads(event.get("body", "{}"))
        
        ordersComplet = []
        ordersFail = []
        order_data = {}
        collection_orders = get_collection(COLLECTION_ORDERS)
        collection_webhook = get_collection(COLLECTION_WEBHOOK)
        collection_records = get_collection(COLLECTION_RECORDS) 
        ids = body.get('ids', [])
        print(f"ids={ids}")
        for id in ids: 
            
            product = list(collection_orders.find({"order_number": id}, {"_id": 0}))
            product = [convert_datetime_to_str(p) for p in product]
            product = product[0] if product else {}
            
            # product = convert_datetime_to_str(product)
            lambda_response = lambda_client.invoke(
                FunctionName=function_name,  
                InvocationType="RequestResponse",
                Payload=json.dumps({"order": product})
            )
            response_payload = json.loads(lambda_response["Payload"].read())
            bodyEpicor = json.loads(response_payload.get("body", "{}"))
            order_data["ov_epicor"] = bodyEpicor.get("ov_epicor", "")
            order_data["internal_state"] = bodyEpicor.get("internal_state", 0)
            order_data = {
                "orderId":id,
                "statusOrder": 'Complete' if bodyEpicor.get("internal_state", 0) == True else 'Error'
            }
            if bodyEpicor.get("internal_state", 0) == True:
                ordersComplet.append(order_data)
            else:
                ordersFail.append(order_data)
            collection_webhook.update_one(
                {"order_id": id},
                {"$set": order_data},
                upsert=True
            )
        idProcess = str(uuid.uuid4())
        collection_records.update_one(
            {"idProcess":idProcess},
            {"$set":{
                "idProcess":idProcess,
                "user":body.get('userName',""),
                "createdAt":datetime.now().strftime("%Y-%m-%d"),
                "actionProcess":'Resend Order',
            }},
            uupsert=True
        )
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
                "Access-Control-Allow-Headers": "Content-Type,Authorization"
            },
            "body": json.dumps({
                "ordersComplet": ordersComplet,
                "ordersFail": ordersFail
            })
        }
    except Exception as e:
        print(f"error= {e}")
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,GET",
                "Access-Control-Allow-Headers": "Content-Type,Authorization"
            },
            "body": json.dumps({"error": str(e)})
        }