import json
import boto3
import os

USER_POOL_ID = os.environ.get("COGNITO_USER_POOL_ID")
client = boto3.client("cognito-idp")


def get_all_users_count(user_pool_id):
    """Paginar para contar todos los usuarios del pool"""
    count = 0
    pagination_token = None

    while True:
        params = {"UserPoolId": user_pool_id, "Limit": 60}
        if pagination_token:
            params["PaginationToken"] = pagination_token

        response = client.list_users(**params)
        count += len(response.get("Users", []))
        pagination_token = response.get("PaginationToken")
        if not pagination_token:
            break

    return count


def default_serializer(obj):
    if hasattr(obj, "isoformat"):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")


def get_user_groups(username):
    try:
        response = client.admin_list_groups_for_user(
            Username=username,
            UserPoolId=USER_POOL_ID
        )
        return [g["GroupName"] for g in response.get("Groups", [])]
    except client.exceptions.UserNotFoundException:
        return []
    except Exception as e:
        print(f"Error obteniendo grupos para {username}: {e}")
        return []


def lambda_handler(event, context):
    try:
        print("EVENT:", event)
        print(f"USER_POOL_ID={USER_POOL_ID}")
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

        query_params = event.get("queryStringParameters", {}) or {}

        # Parámetros con valores por defecto
        limit_str = query_params.get("limit", "10")
        page_str = query_params.get("page", "1")

        try:
            limit = int(limit_str)
            limit = min(max(limit, 1), 60)  # AWS permite máximo 60
        except ValueError:
            limit = 10

        try:
            page = int(page_str)
            page = max(page, 1)
        except ValueError:
            page = 1

        # Obtener total de usuarios
        total_count = get_all_users_count(USER_POOL_ID)

        # Obtener paginación manual
        pagination_token = None
        current_page = 1

        while current_page < page:
            params = {
                "UserPoolId": USER_POOL_ID,
                "Limit": limit
            }
            if pagination_token:
                params["PaginationToken"] = pagination_token

            response = client.list_users(**params)
            pagination_token = response.get("PaginationToken")
            if not pagination_token:
                break
            current_page += 1

        # Obtener usuarios para la página actual
        params = {
            "UserPoolId": USER_POOL_ID,
            "Limit": limit
        }
        if pagination_token:
            params["PaginationToken"] = pagination_token

        response = client.list_users(**params)
        users = response.get("Users", [])

        # Enriquecer cada usuario con sus grupos
        for user in users:
            user["Groups"] = get_user_groups(user["Username"])
        print(f"user={user}")
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,GET",
                "Access-Control-Allow-Headers": "Content-Type,Authorization"
            },
            "body": json.dumps({
                "users": users,
                "total_count": total_count,
                "current_page": page,
                "limit": limit
            }, default=default_serializer)
        }

    except Exception as e:
        print("ERROR:", e)
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,GET",
                "Access-Control-Allow-Headers": "Content-Type,Authorization"
            },
            "body": json.dumps({"error": str(e)})
        }
