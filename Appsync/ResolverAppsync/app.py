import json
import boto3
from pymongo import MongoClient
import os

# Configuración de la conexión a MongoDB
MONGO_URI = os.environ['MONGO_URI']
DATABASE_NAME = os.environ['BD_NAME']
COLLECTION_NAME = os.environ['COLLECTION_RESPONSE']

# Conectar a MongoDB
client = MongoClient(MONGO_URI)
db = client[DATABASE_NAME]
collection = db[COLLECTION_NAME]

def lambda_handler(event, context):
    # Extraer variables del evento (especificadas en la mutación)
    status = event['status']
    process_subid = event['process_subid']
    ecommerce = event['ecommerce']
    product_sku = event['product_sku']
    message = event['message']

    # Crear el mensaje para MongoDB
    mongo_message = {
        'status': status,
        'process_subid': process_subid,
        'ecommerce': ecommerce,
        'product_sku': product_sku,
        'message': message
    }

    # Insertar el mensaje en MongoDB
    try:
        result = collection.insert_one(mongo_message)
        if result.inserted_id:
            print(f'Mensaje insertado en MongoDB con ID: {result.inserted_id}')
        else:
            raise Exception("Error al insertar en MongoDB")
    except Exception as e:
        print(f"Error al insertar en MongoDB: {e}")
        raise Exception(f"Error al insertar en MongoDB: {e}")

    # Devolver la respuesta a AppSync
    return {
        "status": status,
        "process_subid": process_subid,
        "ecommerce": ecommerce,
        "product_sku": product_sku,
        "message": message
    }
