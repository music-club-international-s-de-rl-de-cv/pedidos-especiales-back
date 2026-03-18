import json
import boto3
import os
from pathlib import Path

cognito = boto3.client('cognito-idp')
ses = boto3.client('ses')

USER_POOL_ID = os.environ['COGNITO_USER_POOL_ID']
SENDER_EMAIL = 'hermes-sync-email@hermes-ti.com'

# Ruta a tu plantilla
TEMPLATE_PATH = os.path.join(os.path.dirname(__file__), 'template', 'email_template.html')

def lambda_handler(event, context):
    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    }

    if event['httpMethod'] == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': ''
        }

    try:
        body = json.loads(event['body'])
        username = body.get('username')
        email = body.get('email')
        groups = body.get('groups', [])

        if not username or not email or not groups:
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({'message': 'Faltan datos requeridos.'})
            }

        for group in groups:
            cognito.admin_add_user_to_group(
                UserPoolId=USER_POOL_ID,
                Username=username,
                GroupName=group
            )

        subject = 'Actualización de permisos en Hermes'

        # Mensaje de respaldo (texto plano)
        text_message = f"""Hola,

Tus permisos han sido actualizados en el sistema Hermes.

Se te han asignado los siguientes grupos/permisos:
{chr(10).join(['- ' + g for g in groups])}

Recuerda volver a iniciar sesión para visualizarlos.
Si tienes dudas, contacta con soporte.

Saludos,
Sistema Hermes.
"""

        # HTML
        body_message = f"""
        Hola,<br><br>
        Tus permisos han sido actualizados correctamente en el sistema Hermes.<br><br>
        Se te han asignado los siguientes grupos/permisos:
        <ul>{"".join([f"<li>{g}</li>" for g in groups])}</ul>
        <p>Si tienes dudas, contacta con soporte.</p>
        """

        # Cargar plantilla HTML
        with open(TEMPLATE_PATH, 'r', encoding='utf-8') as f:
            html_template = f.read()

        html_message = html_template.replace("{{subject_title}}", subject).replace("{{body_message}}", body_message)

        # Enviar correo
        ses.send_email(
            Source=SENDER_EMAIL,
            Destination={'ToAddresses': [email]},
            Message={
                'Subject': {'Data': subject},
                'Body': {
                    'Html': {'Data': html_message},
                    'Text': {'Data': text_message}
                }
            }
        )

        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({'message': 'Permisos asignados y correo enviado correctamente.'})
        }

    except Exception as e:
        print('Error:', str(e))
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({'message': 'Error interno al asignar permisos.'})
        }
