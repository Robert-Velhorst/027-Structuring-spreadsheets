# Sheet Shaper Sites frontend

This deployment contains the same reviewed React interface as the Windows app.
It stores no workbook data. In **Connections**, the user supplies the HTTPS
endpoint created by `start-ngrok.ps1`; the bearer token remains in browser
session storage. API requests made before configuration fail explicitly.
