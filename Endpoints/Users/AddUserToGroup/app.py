import boto3
import os

cognito = boto3.client("cognito-idp")
DEFAULT_GROUP = os.environ.get("DEFAULT_GROUP", "Viewer")

def lambda_handler(event, context):
    user_pool_id = event["userPoolId"]
    username = event["userName"]

    try:
        cognito.admin_add_user_to_group(
            UserPoolId=user_pool_id,
            Username=username,
            GroupName=DEFAULT_GROUP
        )
        print(f"Usuario {username} agregado al grupo {DEFAULT_GROUP}")
    except Exception as e:
        print(f"Error al agregar usuario al grupo: {e}")

    return event  # Cognito espera el mismo evento de regreso
