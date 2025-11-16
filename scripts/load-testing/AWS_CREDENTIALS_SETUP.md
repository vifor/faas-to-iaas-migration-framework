# 🔑 Guía para Obtener Credenciales de AWS

## Opción 1: Credenciales IAM (Recomendado)

### **Paso 1: Crear usuario IAM**

1. **Ir a AWS Console:**

   - https://console.aws.amazon.com/iam/
   - Región: cualquiera (IAM es global)

2. **Crear usuario:**

   - Users → Add users
   - Username: `k6-testing-user` (o el nombre que prefieras)
   - Access type: ☑️ **Programmatic access**

3. **Asignar permisos:**

   - Attach existing policies directly
   - Buscar y seleccionar:
     - ☑️ `AmazonCognitoPowerUser`
     - ☑️ `AmazonAPIGatewayAdministrator` (para verificar endpoints)

   O crear política custom con permisos mínimos:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "cognito-idp:AdminGetUser",
           "cognito-idp:AdminAddUserToGroup",
           "cognito-idp:AdminUpdateUserAttributes",
           "cognito-idp:ListGroups",
           "cognito-idp:CreateGroup",
           "cognito-idp:AdminListGroupsForUser"
         ],
         "Resource": "arn:aws:cognito-idp:sa-east-1:*:userpool/sa-east-1_LAeXR4OOV"
       }
     ]
   }
   ```

4. **Guardar credenciales:**
   - ⚠️ **IMPORTANTE:** Copia y guarda el **Access Key ID** y **Secret Access Key**
   - Solo se muestran una vez!

## Opción 2: AWS CloudShell (Alternativa rápida)

Si tienes acceso a la consola de AWS, puedes usar CloudShell:

1. En AWS Console, click en el ícono de CloudShell (>\_)
2. Los comandos se ejecutarán con tus permisos actuales

## Opción 3: Credenciales temporales (Para testing)

Si solo necesitas acceso temporal:

1. AWS Console → Your Name (arriba derecha)
2. Security Credentials
3. Access keys → Create access key
4. Seleccionar "CLI, SDK, & API access"

---

## 🔧 Comandos para configurar AWS CLI

Una vez que tengas las credenciales:

```bash
# Configurar credenciales
aws configure

# Te preguntará:
# AWS Access Key ID: [Tu Access Key]
# AWS Secret Access Key: [Tu Secret Key]
# Default region name: sa-east-1
# Default output format: json
```

## ✅ Verificar configuración

```bash
# Verificar configuración
aws sts get-caller-identity

# Probar acceso a Cognito
aws cognito-idp list-user-pools --max-results 10 --region sa-east-1
```
