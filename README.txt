AZ MOVIES - CLOUDFLARE WORKER

ARCHIVOS
- worker.js: Worker completo. Sirve la aplicación y obtiene el catálogo desde TMDB.
- wrangler.toml: configuración básica opcional.

IMPORTANTE
Este paquete NO conecta fuentes de películas de terceros. El botón "Reproducir" queda preparado
para que conectes contenido que tengas autorización para transmitir.

CÓMO SUBIRLO DESDE CLOUDFLARE
1. En Workers & Pages pulsa "Crear aplicación".
2. Conecta el repositorio de GitHub.
3. Selecciona este repositorio.
4. Implementa el Worker.

DESPUÉS DE IMPLEMENTAR
Debes configurar tu clave de TMDB:
Settings / Configuración -> Variables and Secrets / Variables y secretos
Nombre: TMDB_API_KEY
Valor: tu API Key de TMDB

No tienes que configurar WORKER_URL. El HTML usa el mismo Worker automáticamente.
