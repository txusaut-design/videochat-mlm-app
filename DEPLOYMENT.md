# 🚀 Guía de Deployment - VideoChat MLM

## Deployment en la Nube: Render + Netlify

### 📋 Requisitos Previos
- Cuenta en [Render.com](https://render.com)
- Cuenta en [Netlify](https://netlify.com)
- Repositorio en GitHub (público o privado)

---

## 🎨 1. DEPLOYMENT BACKEND EN RENDER

### Paso 1: Preparar el Repositorio
```bash
# Subir código a GitHub (si no lo has hecho)
git add .
git commit -m "Configuración para deployment en Render"
git push origin main
```

### Paso 2: Crear Cuenta y Proyecto en Render

1. **Ir a [Render.com](https://render.com) y hacer login**
2. **Hacer clic en "New +"** → **"Web Service"**
3. **Conectar repositorio de GitHub:**
   - Buscar y seleccionar `videochat-mlm-app`
   - Hacer clic en "Connect"

### Paso 3: Configurar Web Service

**📋 Configuración Principal:**
```
Name: videochat-mlm-backend
Runtime: Node
Branch: main (o master)
Root Directory: (dejar vacío)
Build Command: cd backend && npm install && npx prisma generate && npm run build
Start Command: cd backend && npm run start:prod
```

### Paso 4: Configurar Variables de Entorno

En **Environment Variables**, agregar:

```env
NODE_ENV=production
PORT=5000
JWT_SECRET=tu-super-secreto-jwt-para-produccion-cambiar-esto
JWT_EXPIRES_IN=7d
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
MLM_LEVEL_1_COMMISSION=3.5
MLM_LEVEL_2_5_COMMISSION=1
MLM_MAX_LEVELS=5
MEMBERSHIP_DURATION_DAYS=28
MEMBERSHIP_PRICE_USD=10
```

### Paso 5: Crear Base de Datos PostgreSQL

1. **En Render Dashboard, hacer clic en "New +"** → **"PostgreSQL"**
2. **Configurar:**
   ```
   Name: videochat-mlm-db
   Database: videochat_mlm
   User: videochat_user
   Region: Same as web service
   Plan: Free
   ```
3. **Copiar la "External Database URL"**
4. **Volver al Web Service** → **Environment Variables**
5. **Agregar:**
   ```env
   DATABASE_URL=postgresql://[External Database URL copiada]
   ```

### Paso 6: Deployment y Testing

1. **Hacer clic en "Create Web Service"**
2. **Esperar a que complete el build** (puede tomar 5-10 minutos)
3. **URL final:** `https://videochat-mlm-backend.onrender.com`
4. **Probar:** `https://videochat-mlm-backend.onrender.com/api/health`

---

## 🌐 2. DEPLOYMENT FRONTEND EN NETLIFY

### Paso 1: Crear Site en Netlify

1. **Ir a [Netlify](https://netlify.com) y hacer login**
2. **Hacer clic en "Add new site"** → **"Import an existing project"**
3. **Seleccionar "GitHub"** y autorizar
4. **Buscar y seleccionar tu repositorio** `videochat-mlm-app`

### Paso 2: Configurar Build Settings

```
Base directory: videochat-mlm-app
Build command: npm run build
Publish directory: videochat-mlm-app/out
```

### Paso 3: Agregar Variables de Entorno

En **Site settings** → **Environment variables**:

```env
NEXT_PUBLIC_API_URL=https://videochat-mlm-backend.onrender.com/api
```

### Paso 4: Deploy y Configurar CORS

1. **Hacer clic en "Deploy site"**
2. **Copiar la URL de Netlify** (ej: `https://amazing-app-123.netlify.app`)
3. **Volver a Render** → **Web Service** → **Environment Variables**
4. **Agregar/Actualizar:**
   ```env
   FRONTEND_URL=https://amazing-app-123.netlify.app
   ```
5. **Redeploy el backend** para aplicar cambios de CORS

---

## 🧪 3. VERIFICACIÓN FINAL

### URLs Finales:
- **Backend API**: `https://videochat-mlm-backend.onrender.com`
- **Frontend App**: `https://amazing-app-123.netlify.app`

### Testing Completo:
1. **✅ API Health**: `https://videochat-mlm-backend.onrender.com/api/health`
2. **✅ Frontend carga**: Abrir la app en el navegador
3. **✅ Login Demo**: Usar botón "Usuario Demo"
4. **✅ Dashboard funciona**: Todas las tabs cargan correctamente
5. **✅ Base de datos**: Los datos demo se cargan automáticamente

---

## 🔧 4. TROUBLESHOOTING

### Errores Comunes:

**❌ Error 503 en Render**
- El servicio gratuito de Render "duerme" después de 15 min sin uso
- Primera carga puede tomar 30-60 segundos en despertar

**❌ Error de CORS**
- Verificar que `FRONTEND_URL` esté configurado correctamente en Render
- Debe apuntar exactamente a la URL de Netlify

**❌ Error de Base de Datos**
- Verificar que `DATABASE_URL` esté configurado en Render
- La base de datos PostgreSQL debe estar en la misma región

**❌ Build Error**
- Revisar logs en Render Dashboard
- Verificar que `cd backend &&` esté en los comandos

---

## 🎉 RESULTADO FINAL

**✅ Aplicación VideoChat MLM 100% en la Nube**

- 🎨 **Backend**: Render + PostgreSQL gratuito
- 🌐 **Frontend**: Netlify + CDN Global
- 🔄 **Deploy Automático**: Cada push a GitHub
- 🔒 **SSL/HTTPS**: Automático en ambos servicios
- 📊 **Escalabilidad**: PostgreSQL + auto-scaling
- 💰 **MLM Sistema 5 Niveles**: Completamente funcional
- 💸 **100% Gratuito**: Sin límites en el plan free

**Estado**: 🚀 **LISTO PARA PRODUCCIÓN**
