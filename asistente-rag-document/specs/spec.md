# Especificación · Asistente RAG sobre documentos

Un usuario sube sus PDFs y conversa con ellos; cada respuesta muestra de qué documento y página sale.

**Problema.** Buscar un dato en manuales, contratos o apuntes largos lleva tiempo, y un chat genérico inventa cuando no sabe.

**Usuario.** Una persona con un puñado de documentos propios (hasta 20 PDFs) que quiere respuestas rápidas y verificables.

**Dentro del alcance (v1):** subir PDFs, listarlos y borrarlos; chat con historial por conversación; citas con enlace a la página; respuestas en streaming; inicio de sesión.

**Fuera del alcance (v1):** Word, imágenes o páginas web; OCR de PDFs escaneados; documentos compartidos entre usuarios; app móvil; ajuste fino de modelos.

## Historias de usuario

### H1 · Subir un documento

- Dado un PDF de texto de hasta 10 MB y 50 páginas, cuando lo subo, entonces aparece en mi lista como "Procesando" y pasa a "Listo" sin recargar la página.
- Dado un archivo que no es PDF o pesa más de 10 MB, cuando lo subo, entonces veo un error que dice el motivo y no se guarda nada.
- Dado que ya tengo 20 documentos, cuando subo otro, entonces veo un error que lo explica y no se guarda nada.
- Dado un PDF de más de 50 páginas, cuando termina el proceso, entonces queda en "Error" con un mensaje que dice el motivo.
- Dado un PDF escaneado sin texto, cuando termina el proceso, entonces queda en "Sin texto" con un mensaje que lo explica.

### H2 · Preguntar

- Dado al menos un documento "Listo", cuando escribo una pregunta, entonces la respuesta empieza a aparecer en menos de 3 s y llega en streaming.
- Dada una respuesta, entonces cada afirmación lleva una cita numerada [1], [2]… con nombre del documento y página.
- Dada una pregunta cuya respuesta no está en mis documentos, entonces el asistente responde que no la encuentra y no muestra citas.

### H3 · Verificar una cita

- Dada una cita, cuando hago clic, entonces veo el fragmento exacto usado y un enlace que abre el PDF en esa página.
- Dada una cita de un documento que ya borré, cuando hago clic, entonces veo "Fuente borrada" sin fragmento ni enlace.

### H4 · Seguir la conversación

- Dada una respuesta previa, cuando hago una pregunta de seguimiento ("¿y el plazo?"), entonces el asistente la entiende en el contexto de la conversación.
- Dadas varias conversaciones, cuando vuelvo a una, entonces veo su historial completo.

### H5 · Elegir en qué documentos buscar

- Dada una conversación, cuando marco solo algunos documentos, entonces las respuestas citan únicamente esos.

### H6 · Borrar un documento

- Dado un documento, cuando lo borro, entonces desaparecen también su archivo y sus fragmentos, y deja de aparecer en respuestas nuevas.

## Requisitos no funcionales

Límites pensados para un proyecto de portafolio con demo pública y coste casi cero.

| Área | Requisito |
|---|---|
| Latencia | Primer token en menos de 3 s; respuesta completa en menos de 15 s |
| Ingesta | Un PDF de 50 páginas queda "Listo" en menos de 60 s |
| Límites | 10 MB y 50 páginas por PDF; 20 PDFs y 30 preguntas al día por usuario |
| Coste | Menos de 5 USD al mes con uso de demo |
| Seguridad | Claves de API solo en el servidor; archivos en almacenamiento privado con URLs firmadas |
| Privacidad | Borrar un documento elimina el archivo, sus fragmentos y sus vectores; las citas antiguas no conservan su texto |
| Accesibilidad | Chat usable con teclado; citas con texto, no solo color |
| Idioma | Interfaz en español, incluido el mensaje fijo "No lo encuentro en tus documentos"; las respuestas redactadas por el LLM van en el idioma de la pregunta |
