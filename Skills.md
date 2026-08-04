# Skills del proyecto SESHA APP

Este archivo documenta las habilidades y flujos principales del sistema para facilitar mantenimiento, desarrollo y colaboración.

## 1. Autenticación y usuarios

- Registro de usuarios con dominio @sesha.com.
- Login con JWT para acceso seguro.
- Usuarios demo para pruebas locales.
- Contraseñas demo:
  - Administrador: correo de ejemplo: <admin@sesha.com> / contraseña: 123456
  - Empleados: correo de ejemplo: <nombre.apellido@sesha.com> / contraseña: Sesha2026!

## 2. Gestión de módulos

- Empleados
- Documentos
- Solicitudes
- Perfil
- Dashboard principal

## 3. Reglas de desarrollo

- Mantener el backend y frontend compatibles.
- Probar cambios en backend y frontend antes de publicar.
- No introducir cambios innecesarios.
- Usar JWT para la autenticación.

## 4. Comandos útiles

- Backend:
  - npm test
  - npm start
- Frontend:
  - npm test -- --watch=false --runInBand
  - npm run build
