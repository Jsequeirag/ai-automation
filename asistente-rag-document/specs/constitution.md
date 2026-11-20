# Constitución · Asistente RAG sobre documentos

Cinco principios; si una tarea choca con uno, gana el principio.

1. **Toda respuesta cita su fuente.** Documento y página de cada fragmento usado. Sin cita, no hay respuesta.
2. **No inventar.** Si los documentos no contienen la respuesta, el asistente lo dice ("No lo encuentro en tus documentos").
3. **Lo más simple que funcione.** Una sola app Next.js, una sola base de datos (Postgres con pgvector). Nada de colas, microservicios ni frameworks extra hasta que una métrica lo pida.
4. **Cada usuario ve solo sus documentos.** Todo acceso a datos filtra por `user_id`.
5. **Medible.** La calidad se comprueba con un set fijo de preguntas (ver `tasks.md` › Evaluación), no a ojo.
