# 🚀 Stock Price Deploy — Automatización de Despliegue y Configuración de Infraestructura (Backend)

Este repositorio contiene los scripts, plantillas y configuraciones necesarias para desplegar la infraestructura del sistema de gestión de precios y pedidos en AWS (Backend). Se utilizan herramientas como **AWS SAM**, **PowerShell**, **Shell Scripts**, y **Configuración TOML** para entornos reproducibles y automatizados.

---

## 🧱 Estructura del Proyecto

```

├── UpdatePrice/                      # Funciones lambda que hacen la actualización de precio a los marketplaces
│   ├── Dev                           # Funciones de marketplaces Dev
│   ├── Prod                          # Funciones de marketplaces Prod
├── Syncstock/                        # Funciones lambda que hacen la sincronizacion de stock
│   ├── Epicor                        # Procesar OV en Epicor 
│   ├── FetchOrders                   # Obtener las OV
│   └── GetOrders                     # Obtener las OV y desplegar en el front
│   └── UpdateStock                   # Actualiza stock
├── Liverpool/                        # Acciones del mk Liverpool
│   └── ProcessLiverpoolBatch         # Proceso de Liverpool (actualizar precio y stock)
├── Inventary/                        # Funciones que obtiene el universo de productos de los mks
├── Events/                           # Eventos para testing
├── Endpoints/                        # Funciones que mapean a endpoints de la apigateway
│   ├── Liverpool                     # Endpoints de liverpool
│   └── Logic                         # Endpoints lógicos
├── Appsync/                          # Resolver de appsync
├── README.md                         # Archivo README.md
└── .env.example                      # Variables de entorno requeridas
└── deploy.ps1                        # Scriot de deploy para Windows
└── deploy.sh                         # Scriot de deploy para Mac o Linux
└── samconfig.develop.toml            # Archivo .toml de configuración develop
└── samconfig.toml                    # Archivo .toml de configuración default
└── template.yaml                     # Template SAM

````

---

## 🧰 Requisitos Previos

- AWS CLI configurado (`aws configure`) 
- SAM CLI instalado (`sam --version`)
- Node.js y NPM
- Python
- Permisos necesarios para ejecutar políticas de CloudFormation, Lambda y demás servicios implicados
- Autenticación con perfiles configurados (`--profile`)

> **Importante**: Solicita la creación de tus credenciales en AWS al techlead

---


## 🧩 Plantillas `template.yaml`

Las plantillas están escritas en formato **AWS SAM** e incluyen recursos como:

* Lambdas
* Roles IAM
* EventBridge Rules
* AppSync Datasources
* S3 Buckets
* SQS Queues
* Variables de entorno

Fragmento ejemplo:

```yaml
Resources:
  ProcessLambda:
    Type: AWS::Serverless::Function
    Properties:
      Handler: src/process.handler
      Runtime: nodejs18.x
      Environment:
        Variables:
          ENV: !Ref Environment
          MONGODB_URI: !Ref MongoDBUri
```

---

## 📦 Flujo de Despliegue Automatizado

1. Selección del entorno `develop`
2. Lectura del archivo `.toml` correspondiente
3. Inyección dinámica de variables de entorno
4. Despliegue con `sam deploy` usando el script de despliegue

> Todos los entornos usan la plantilla base `template.yaml` y la combinan con plantillas específicas.

---

---

## 🪜 Setp by Step

### Instalación
```bash
git clone https://github.com/music-club-international-s-de-rl-de-cv/stock-price-back.git
cd stock-price-back
```

### Realizar tus cambios
```
Actualizar tu recurso o crear uno nuevo, en caso de ser así, seguir la misma arquitectura
```

### Definir tu recurso en el template.yaml
```
En dado caso de requerir un servicio de AWS, definirlo en el templte (recuerda los roles y permisos)
```

### Solicta el archivo .env de develop
```
Debes crear un archivo .env.develop y pegar las mismas variables que estam en el .env.example
```

### Solicta la integración de una nueva .env
```
En caso de que requieras una nueva variable de entorno, deberas definirla en el .env.example y al momento 
de hacer pr a develop y a main indicar que necesitas la integración.

Como tu puedes hacer deploy a develop, tambien integrarla en el .env.develop pero no olvides el primer paso
porque se necesitará la referencia producción de la misma manera
```

### Deploy
```
Una vez garantizando los pasos previos, podrás hacer el deploy a develop. Ve a la sección siguiente y entenderás como hacerlo.
```
---

## ⚙️ Scripts de Despliegue

### Despliegue en entorno **Desarrollo** (Windows)

```powershell
.\deploy-dev.ps1 develop
````

### Despliegue en **Linux/macOS**

```bash
./deploy.sh develop    
```

---


## 🔒 Buenas Prácticas y Seguridad

* 🔐 Los archivos `.toml` y archivos `.env` son dinámicos según el entorno seleccionado.
* 🚫 No se permite despliegue directo a producción, solo a develop.

---

## 👨‍💻 Autor

**Enrique Velasco Jiménez**
👨 GitHub: [@EnriqueVelascoJi](https://github.com/EnriqueVelascoJi)
📧 Email: [email-enrique](mailto:enrique.velasco@hermes-music.com.mx)
🏢 Organización: [Hermes Music](https://github.com/music-club-international-s-de-rl-de-cv)

---
