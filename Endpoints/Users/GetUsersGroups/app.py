import json
import boto3
import os

USER_POOL_ID = os.environ.get("COGNITO_USER_POOL_ID")
client = boto3.client("cognito-idp")


def list_all_groups(user_pool_id):
    groups = []
    next_token = None

    while True:
        params = {
            "UserPoolId": user_pool_id,
            "Limit": 60  # máximo permitido
        }
        if next_token:
            params["NextToken"] = next_token

        response = client.list_groups(**params)
        groups.extend(response.get("Groups", []))
        next_token = response.get("NextToken")
        if not next_token:
            break

    return groups


def lambda_handler(event, context):
    try:
        print("EVENT:", event)

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

        groups = list_all_groups(USER_POOL_ID)

        # Formatear salida (solo campos relevantes si quieres)
        formatted_groups = [
            {
                "GroupName": g["GroupName"],
                "Description": g.get("Description", ""),
                "Precedence": g.get("Precedence", 0),
                "LastModifiedDate": g["LastModifiedDate"].isoformat() if "LastModifiedDate" in g else None,
                "CreationDate": g["CreationDate"].isoformat() if "CreationDate" in g else None
            }
            for g in groups
        ]

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,GET",
                "Access-Control-Allow-Headers": "Content-Type,Authorization"
            },
            "body": json.dumps({"groups": formatted_groups})
        }

    except Exception as e:
        print("ERROR:", e)
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({"error": str(e)})
        }
