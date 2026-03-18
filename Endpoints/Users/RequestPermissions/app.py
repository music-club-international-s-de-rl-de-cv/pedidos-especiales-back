import json
import boto3
import os

cognito = boto3.client('cognito-idp')
ses = boto3.client('ses')

USER_POOL_ID = os.environ['COGNITO_USER_POOL_ID']
SENDER_EMAIL = 'hermes-sync-email@hermes-ti.com'

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
        requester_email = body.get('email')
        permissions = body.get('permissions', [])

        if not requester_email or not permissions:
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({'message': 'Faltan datos requeridos.'})
            }

        # Obtener correos del grupo Admin
        admin_emails = []
        response = cognito.list_users_in_group(
            UserPoolId=USER_POOL_ID,
            GroupName='Admin'
        )
        for user in response['Users']:
            for attr in user['Attributes']:
                if attr['Name'] == 'email':
                    admin_emails.append(attr['Value'])

        if not admin_emails:
            return {
                'statusCode': 500,
                'headers': cors_headers,
                'body': json.dumps({'message': 'No se encontraron administradores.'})
            }

        template_path = os.path.join(os.path.dirname(__file__), 'template', 'email_template.html')

        with open(template_path, 'r', encoding='utf-8') as file:
            html_template = file.read()

        subject = f'Solicitud de permisos de {requester_email}'
        permissions_html = ''.join(f'<li>{p}</li>' for p in permissions)
        body_html = f"""
        Hola,<br><br>
        El usuario <strong>{requester_email}</strong> ha solicitado acceso a los siguientes permisos:<br><br>
        <ul>{permissions_html}</ul>
        Puedes aprobar o rechazar esta solicitud desde el panel de administración.
        """

        html_message = html_template \
            .replace('{{subject_title}}', subject) \
            .replace('{{body_message}}', body_html)

        text_message = f"""Hola,

El usuario {requester_email} ha solicitado acceso a los siguientes permisos:

{chr(10).join(['- ' + p for p in permissions])}

Puedes aprobar o rechazar esta solicitud desde el panel de administración.

Saludos,
Sistema Hermes."""

        # Enviar correos
        for email in admin_emails:
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
            'body': json.dumps({'message': 'Solicitud enviada a administradores.'})
        }

    except Exception as e:
        print('Error:', str(e))
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({'message': 'Error interno al enviar solicitud.'})
        }
