# Guía de Configuración de Autorización en Cognito

## 📋 Configuración Manual en AWS Console

### **Paso 1: Acceder a Cognito User Pool**

1. **Ir a AWS Console:**

   - Abrir: https://console.aws.amazon.com/cognito/
   - Región: **sa-east-1** (South America - São Paulo)

2. **Seleccionar User Pool:**
   - User Pool ID: `sa-east-1_LAeXR4OOV`
   - Buscar y hacer click en este User Pool

### **Paso 2: Verificar/Crear Grupos**

1. **Ir a la sección "Groups"** en el menú lateral
2. **Verificar que existan estos grupos:**

   - `Customer`
   - `StoreOwnerRole`
   - `FranchiseOwnerRole`

3. **Si no existen, crear el grupo "StoreOwnerRole":**
   ```
   Group name: StoreOwnerRole
   Description: Store owners with access to specific stores
   Precedence: 1
   IAM Role: (dejar vacío por ahora)
   ```

### **Paso 3: Agregar Usuario al Grupo**

1. **Ir a la sección "Users"**
2. **Buscar usuario:** `victoria.pocladova@gmail.com`
3. **Click en el username para abrir detalles**
4. **Ir a pestaña "Group memberships"**
5. **Click "Add user to group"**
6. **Seleccionar:** `StoreOwnerRole`
7. **Click "Add"**

### **Paso 4: Configurar Atributos Custom (Opcional pero Recomendado)**

1. **En la página del usuario, ir a "Attributes"**
2. **Click "Edit"**
3. **Agregar atributos custom:**
   ```
   custom:employmentStoreCodes = store-001
   custom:role = StoreOwner
   ```
4. **Click "Save changes"**

### **Paso 5: Configurar Amazon Verified Permissions**

1. **Ir a Amazon Verified Permissions:**

   - https://console.aws.amazon.com/verifiedpermissions/
   - Región: **sa-east-1**

2. **Seleccionar tu Policy Store**

   - Buscar el Policy Store creado por tu aplicación

3. **Crear nueva política:**

   ```cedar
   permit (
     principal == MyApplication::User::"victoria.pocladova@gmail.com",
     action in [
       MyApplication::Action::"SearchPets",
       MyApplication::Action::"AddPet",
       MyApplication::Action::"UpdatePet",
       MyApplication::Action::"DeletePet",
       MyApplication::Action::"PlaceOrder",
       MyApplication::Action::"GetOrder",
       MyApplication::Action::"ListOrders",
       MyApplication::Action::"GetStoreInventory"
     ],
     resource == MyApplication::Store::"store-001"
   );
   ```

4. **Validar y activar la política**

## 🔧 **Método Alternativo: PowerShell con AWS Tools**

### **Instalar AWS Tools para PowerShell:**

```powershell
# Instalar módulo de AWS
Install-Module -Name AWS.Tools.CognitoIdentityProvider -Force -AllowClobber

# Configurar credenciales (necesitarás Access Key y Secret Key)
Set-AWSCredential -AccessKey "TU_ACCESS_KEY" -SecretKey "TU_SECRET_KEY" -StoreAs default

# Configurar región
Set-DefaultAWSRegion -Region sa-east-1
```

### **Comandos PowerShell para configuración:**

```powershell
# 1. Listar grupos existentes
Get-CGIPGroups -UserPoolId "sa-east-1_LAeXR4OOV"

# 2. Crear grupo StoreOwnerRole si no existe
New-CGIPGroup -UserPoolId "sa-east-1_LAeXR4OOV" -GroupName "StoreOwnerRole" -Description "Store owners with store access"

# 3. Agregar usuario al grupo
Add-CGIPUserToGroup -UserPoolId "sa-east-1_LAeXR4OOV" -Username "victoria.pocladova@gmail.com" -GroupName "StoreOwnerRole"

# 4. Configurar atributos custom
$attributes = @(
    @{Name="custom:employmentStoreCodes"; Value="store-001"},
    @{Name="custom:role"; Value="StoreOwner"}
)
Update-CGIPUserAttributes -UserPoolId "sa-east-1_LAeXR4OOV" -Username "victoria.pocladova@gmail.com" -UserAttributes $attributes

# 5. Verificar configuración
Get-CGIPUser -UserPoolId "sa-east-1_LAeXR4OOV" -Username "victoria.pocladova@gmail.com"
```

## ✅ **Verificación de Configuración**

### **Script K6 para probar autorización:**

```javascript
// test-auth-config.js
import http from "k6/http";
import { check } from "k6";

export default function () {
  // Intentar obtener token JWT desde Cognito
  const cognitoUrl = "https://cognito-idp.sa-east-1.amazonaws.com/";
  const clientId = "34uf0bee83j3ciq8sd7durq31k";

  const authData = {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: clientId,
    AuthParameters: {
      USERNAME: "victoria.pocladova@gmail.com",
      PASSWORD: "tesis1512_",
    },
  };

  console.log("🔐 Probando autenticación con Cognito...");

  const authResponse = http.post(cognitoUrl, JSON.stringify(authData), {
    headers: {
      "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
      "Content-Type": "application/x-amz-json-1.1",
    },
  });

  console.log(`Auth response: ${authResponse.status}`);

  if (authResponse.status === 200) {
    const authResult = JSON.parse(authResponse.body);
    const idToken = authResult.AuthenticationResult.IdToken;

    console.log("✅ Autenticación exitosa!");

    // Probar acceso a store endpoint con JWT
    const storeUrl =
      "https://5brhnloiod.execute-api.sa-east-1.amazonaws.com/main/store/store-001/pets";

    const storeResponse = http.get(storeUrl, {
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log(`Store access: ${storeResponse.status}`);

    if (storeResponse.status === 200) {
      console.log("✅ Acceso autorizado a store-001!");
    } else {
      console.log(`❌ Acceso denegado: ${storeResponse.body}`);
    }
  } else {
    console.log(`❌ Error de autenticación: ${authResponse.body}`);
  }
}
```

## 📝 **Checklist de Configuración**

- [ ] **Usuario existe en Cognito User Pool**
- [ ] **Usuario está en grupo "StoreOwnerRole"**
- [ ] **Atributos custom configurados:**
  - [ ] `custom:employmentStoreCodes = store-001`
  - [ ] `custom:role = StoreOwner`
- [ ] **Política AVP creada para el usuario**
- [ ] **Política activa y validada**

## 🎯 **Siguiente Paso**

Una vez completada la configuración, ejecutar:

```bash
k6 run test-auth-config.js
```

Esto te dirá si la autorización está funcionando correctamente.
