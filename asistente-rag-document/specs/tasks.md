# Tareas · Asistente RAG sobre documentos

Cinco fases en orden; cada tarea cierra con una comprobación concreta y no se empieza la siguiente fase sin terminar la anterior.

## Fase 0 · Base

- [x] T01 Proyecto Next.js 16 con TypeScript estricto, ESLint y `specs/` (ya creado con `create-next-app`). *Prueba: `npm run build` pasa.*
- [x] T02 Crear el proyecto en Supabase, activar pgvector (≥ 0.8), aplicar el SQL del modelo de datos con RLS y `rag_match_chunks`, y crear el bucket privado con sus políticas. *Prueba: un usuario no puede leer filas ni archivos de otro.*
- [x] T03 Inicio de sesión con enlace mágico y rutas protegidas bajo `/app`. *Prueba: sin sesión, `/app` redirige al login.*

## Fase 1 · Ingesta y set de evaluación (H1, H6)

- [x] T04 `POST /api/documents`: validar tipo, tamaño y límite de 20 documentos, y guardar en Storage. *Prueba: un .docx, un PDF de 11 MB y el documento 21 devuelven error y no guardan nada.*
- [x] T05 Pipeline con `after()`: `PDFLoader` → divisor → embeddings → `rag_chunks`, con estados. *Prueba: un PDF de 50 páginas queda `ready` en menos de 60 s.*
- [x] T06 Marcar `no_text` los PDFs sin texto y `error` los de más de 50 páginas, con el motivo. *Prueba: con un PDF escaneado y uno de 60 páginas.*
- [x] T07 Lista de documentos con estado en vivo (sondeo cada 2 s mientras haya `processing`) y botón de borrar. *Prueba: pasa a "Listo" sin recargar; al borrar, `rag_chunks` y Storage quedan sin nada de ese documento.*
- [x] T08 Set de evaluación: elegir los 2 PDFs de ejemplo y escribir `eval/questions.json` (ver Evaluación). *Prueba: 20 preguntas con el reparto 12/4/4 y ambos PDFs en `ready`.*

## Fase 2 · Consulta (H2, H3)

- [x] T09 Recuperación con `rag_match_chunks` y umbral, fijado con las preguntas de T08. *Prueba: las preguntas fuera de tema no superan el umbral y las 16 con respuesta traen su página entre los 6. Las del tema pero sin respuesta (precio, cápsulas, fumar) superan cualquier umbral útil, porque la similitud mide el tema y no si el texto responde; esas las frena la regla del prompt (T10) y se miden con "No inventa" en T15.* Resultado: umbral 0,79; recuperación 16/16; similitud mínima con respuesta 0,813, fuera de tema 0,767, del tema sin respuesta hasta 0,920.
- [x] T10 Prompt con fragmentos numerados, regla de citar y de decir "no lo encuentro"; `POST /api/chat` con streaming y citas en la metadata. *Prueba: primer token en menos de 3 s.* Resultado (dev, 7 preguntas del set): primer token con mediana ~2 s (1,3–2,6 s; 3,5 s solo en la primera petición, que compila la ruta); citas en la página esperada; precio, cápsulas y fumar responden "No lo encuentro" sin citas; Australia, sin llamar al LLM.
- [x] T11 Citas en la UI: [n] clicable con fragmento y enlace al PDF en su página; "Fuente borrada" si el documento ya no existe. *Prueba: el enlace abre la página correcta.* Resultado: `GET /api/documents/:id/url?page=n` (firmada 10 min, `#page=n`; 404 → "Fuente borrada"); el panel muestra el fragmento completo y el enlace abrió la pág. 11 del manual.

## Fase 3 · Conversación (H4, H5)

- [ ] T12 Guardar mensajes y citas; lista de conversaciones con título tomado de la primera pregunta. *Prueba: al recargar se ve el historial.*
- [ ] T13 Reescritura de la pregunta con historial (solo si lo hay). *Prueba: "¿y el plazo?" tras una respuesta sobre un contrato encuentra el plazo.*
- [ ] T14 Selector de documentos por conversación (`PATCH /api/conversations/:id`). *Prueba: solo se citan los marcados.*

## Fase 4 · Calidad y entrega

- [ ] T15 Script `npm run eval` con el set de T08 (sección Evaluación). *Prueba: imprime las métricas.*
- [ ] T16 Límite de 30 preguntas al día (`429`) y revisión de todos los mensajes de error en español.
- [ ] T17 Desplegar en Vercel con los 2 PDFs de ejemplo precargados y un cron que evite la pausa de Supabase.
- [ ] T18 README con captura, arquitectura y cómo correrlo en local.

## Evaluación y definición de terminado

El proyecto está terminado cuando pasa el set de evaluación con estas metas y la demo está publicada.

**Set de evaluación.** 2 PDFs de ejemplo (un manual y un contrato) y 20 preguntas en `eval/questions.json`, cada una con su respuesta esperada y la página correcta:

- 12 con la respuesta en una sola página.
- 4 que necesitan juntar dos fragmentos.
- 4 cuya respuesta no está en los documentos.

| Métrica | Cómo se mide | Meta |
|---|---|---|
| Recuperación | La página correcta está entre los 6 fragmentos recuperados | ≥ 90 % |
| Citas correctas | La cita apunta a la página esperada | ≥ 85 % |
| Respuesta correcta | Coincide con la esperada (juez LLM o revisión manual) | ≥ 80 % |
| No inventa | Las 4 preguntas sin respuesta reciben "No lo encuentro" y ninguna cita | 4 de 4 |
| Latencia | Primer token, mediana de las 20 preguntas | < 3 s |

**Para pasarlo al portafolio** (los dos últimos puntos se hacen en el repositorio del portafolio, no en este):

- [ ] Metas del set cumplidas y resultado guardado en el README.
- [ ] Demo pública en Vercel y repositorio en GitHub.
- [ ] Captura real como portada de la tarjeta (reemplaza `langchain-rag.webp`).
- [ ] En `content/home.html`: año en vez de "En desarrollo" y enlaces "Ver demo" y "Código" en vez de "Próximamente".
