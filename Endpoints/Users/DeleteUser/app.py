import json
import os
import boto3

COGNITO_USER_POOL_ID = os.environ.get("COGNITO_USER_POOL_ID")
client = boto3.client("cognito-idp")

def lambda_handler(event, context):
    try:
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

        body = json.loads(event.get("body") or "{}")
        username = body.get("username")

        if not username:
            return {
                "statusCode": 400,
                "headers": {"Access-Control-Allow-Origin": "*"},
                "body": json.dumps({"error": "username es requerido"})
            }

        client.admin_delete_user(
            UserPoolId=COGNITO_USER_POOL_ID,
            Username=username
        )

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,POST",
                "Access-Control-Allow-Headers": "Content-Type,Authorization"
            },
            "body": json.dumps({"message": "Usuario eliminado"})
        }

    except Exception as e:
        print(f"ERROR = {e}")
        return {
            "statusCode": 500,
            "headers": {"Access-Control-Allow-Origin": "*"},
            "body": json.dumps({"error": str(e)})
        }