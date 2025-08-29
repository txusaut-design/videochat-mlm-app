# 🚀 Instrucciones para Demo Completa - VideoChat MLM

## ⚡ Ejecución Local (Recomendado)

### 1. **Terminal 1 - Backend API**
```bash
cd videochat-mlm-app/backend
npm run dev
```
Esto iniciará el servidor en `http://localhost:5000`

### 2. **Terminal 2 - Frontend**
```bash
cd videochat-mlm-app
npm run dev
```
Esto iniciará la aplicación en `http://localhost:3000`

### 3. **Credenciales de Prueba**
- **Usuario Demo**: `demo@example.com` / `demo123`
- **Usuario Admin**: `admin@videochat-mlm.com` / `demo123`

## 🎯 **Funcionalidades a Probar**

### **Sistema de Autenticación**
1. Hacer clic en "Usuario Demo" para login automático
2. O usar las credenciales: `demo@example.com` / `demo123`
3. Probar registro de nuevos usuarios con códigos de referido

### **Dashboard MLM**
- **Tab "Salas de Chat"**: Ver y crear salas de videochat
- **Tab "Membresía"**: Estado de membresía y pagos
- **Tab "Red MLM"**: Estructura de red y estadísticas
- **Tab "Ganancias"**: Historial de comisiones y earnings

### **Sistema de Videochat WebRTC**
1. Crear una nueva sala o unirse a una existente
2. Permitir acceso a cámara y micrófono
3. Probar controles de audio/video
4. Abrir en múltiples pestañas para simular múltiples usuarios

### **Sistema de Pagos**
1. Ir a Tab "Membresía" → "Activar Membresía"
2. Seleccionar criptomoneda (USDT, USDC, BUSD)
3. Usar botón "Demo" para generar hash de transacción
4. Verificar que se extiende la membresía y se distribuyen comisiones

### **Red MLM**
1. Registrar usuarios con código de referido `demo_user`
2. Procesar pagos de los nuevos usuarios
3. Verificar distribución automática de $1 USD por nivel
4. Ver actualización en tiempo real de estadísticas

## 🗄️ **Base de Datos**

- **Archivo**: `backend/dev.db` (SQLite)
- **Datos Incluidos**: 17 usuarios con estructura MLM completa
- **Salas**: 4 salas de videochat pre-configuradas
- **Pagos**: Historial de transacciones y comisiones

## 🔄 **Resetear Datos de Prueba**
```bash
cd videochat-mlm-app/backend
npm run db:seed
```

## ⚠️ **Nota sobre Versión Desplegada**
La versión en Netlify (`https://same-42h5usjt1ni-latest.netlify.app`) **NO** funcionará completamente porque el backend no está desplegado. Para una demo completa, usar la versión local.

## 🌐 **Desplegar Backend (Opcional)**
Para tener una versión completamente funcional en la web, el backend necesitaría ser desplegado en:
- Railway.app
- Render.com
- Vercel (con Serverless Functions)
- Heroku
- Digital Ocean

¡La aplicación está **100% funcional** ejecutándose localmente!
