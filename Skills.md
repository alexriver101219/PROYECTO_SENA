# Flujos de SESHA APP

- Autenticación y permisos: cookie HttpOnly, JWT de dos horas y protección CSRF; no almacenar tokens en el navegador.
- Contraseña académica conservada: admin@sesha.com / 123456. Crear la cuenta con npm run seed antes de publicar.
- Las cuentas nuevas reciben un perfil laboral ficticio en una transacción. El administrador puede editar documento, cargo, área y fecha de ingreso desde Empleados.
- Documentos y Mi perfil generan la misma constancia laboral personalizada, con fecha de expedición actual en America/Bogota.
- Los PDF y solicitudes se guardan en MongoDB; no mostrar éxito antes de persistir.
- Verificar con npm run lint, npm test, npm run build y npm audit desde la raíz.
- Consultar README.md para la configuración de Atlas y Vercel. No ejecutar migraciones, semillas o despliegues sobre servicios reales durante pruebas locales.
