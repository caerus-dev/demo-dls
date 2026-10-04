# Caerus DLS — Demo de Locking Distribuido y Deadlocks

Demostración interactiva de **Caerus Distributed Locking Service (DLS)**: exclusión mutua distribuida, concurrencia de lectura compartida, generación de **Fencing Tokens** monotónicos y **detección automática de Deadlocks** en tiempo real.

Corre contra el motor Caerus utilizando el SDK oficial `@caerus-dev/sdk` y ejercita las capacidades de transacciones gestionadas (`withTransaction`) y adquisición streaming de locks.

---

## 🚀 Quickstart

Levantá la aplicación en local en 3 pasos:

```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar variables de entorno (opcional si usas motor local o cloud)
cp .env.example .env.local # O edita .env.local

# 3. Iniciar el servidor de desarrollo
pnpm dev
```

Abrí [http://localhost:3000](http://localhost:3000) en tu navegador para ver la interfaz de visualización y el panel de llamadas en tiempo real.

---

## 🎭 Los 4 Escenarios de Demostración

La demo incluye cuatro simulaciones visuales que podés disparar desde los botones superiores:

| Escenario | Modo de Lock | Qué demuestra |
|---|---|---|
| **Lectura Compartida** | `SHARED_READ` | Múltiples workers leen el mismo archivo (`file:reports_export`) en paralelo. El motor otorga los locks de inmediato sin bloqueos ni contención. |
| **Exclusión Mutua** | `EXCLUSIVE` | Workers compiten por escribir en un archivo. Cada worker adquiere el lock de forma secuencial y recibe un **Fencing Token** incremental (`#1`, `#2`...). Los demás quedan esperando en streaming gRPC. |
| **Detección de Deadlock** | Cruzado (`EXCLUSIVE`) | Worker Alfa tiene el archivo y pide la red. Worker Beta tiene la red y pide el archivo. Caerus detecta el ciclo en el grafo distribuido, **aborta la transacción víctima** de Beta, permite que Alfa termine y luego reintenta Beta exitosamente. |
| **Estampida (100 Workers)** | Concurrencia masiva | 100 workers concurrentes intentan tomar el mismo recurso para liquidar ventas. Demuestra la estabilidad del streaming gRPC, justicia en el encolamiento (*fairness*) y prevención de *thundering herd*. |

---

## 📡 El Panel de Llamadas en Vivo (Live SDK Inspector)

A la derecha de la interfaz podés observar **cada llamada gRPC real realizada al SDK**, con argumentos, tiempos de resolución en milisegundos y tokens devueltos:

```typescript
// Ejemplo de llamada registrada en vivo:
dls.withTransaction(async (tx) => …)
tx.acquireLock('task_processing', 'file:reports_export', 'EXCLUSIVE', { ttlSeconds: 30 })
// => ACQUIRED · fencing token #1 (42 ms)
```

Las llamadas se interceptan mediante un contexto asíncrono (`AsyncLocalStorage`) para medir tiempos exactos sin ensuciar la lógica de negocio de los workers.

---

## ⚙️ Configuración (`.env.local`)

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# API Key emitida en el dashboard de Caerus
CAERUS_API_KEY=caer_prod_tu_api_key_aqui

# Endpoint gRPC del motor Caerus
CAERUS_ENDPOINT=data-plane.caerus.dev:9090

# Cifrado TLS (true por defecto; false para entornos locales)
CAERUS_TLS=true

# Namespace de lock utilizado para las demostraciones
DLS_NAMESPACE=task_processing
```

### Correr contra un Caerus local

Si tenés levantado el cluster local de Caerus (PostgreSQL, Redis, RabbitMQ y `data-plane-service` en puerto `9090`):

```env
CAERUS_ENDPOINT=localhost:9090
CAERUS_TLS=false
CAERUS_API_KEY=caer_dev_T3STK3Y00000000000001
DLS_NAMESPACE=task_processing
```

> [!NOTE]
> `CAERUS_TLS=false` es obligatorio para conexiones gRPC locales sin certificados SSL emitidos.

---

## 📋 Plantilla que espera en el Dashboard

Para ejecutar contra un ambiente real de Caerus, asegurate de tener creada una plantilla en la sección **Distributed Locks** de tu aplicación:

* **Namespace**: `task_processing`
* **Tipo**: `Exclusivo` (o `Lectura-Escritura`)
* **Resolución de Conflictos**: `QUEUE` (Encolar)
* **Resolución de Deadlocks**: `KILL` (Abortar víctima de menor prioridad)
* **Fencing Tokens**: `Activado` (Recomendado)

---

## 🧠 Conceptos Clave que defiende esta Demo

1. **Fencing Tokens Monotónicos:**
   Un Distributed Lock no previene por sí solo que un worker pausado por Garbage Collection sobreescriba datos obsoletos (*split-brain / zombie write*). Caerus emite tokens monotónicamente incrementales que los sistemas de almacenamiento verifican antes de aplicar cambios.

2. **Transacciones Atómicas con `withTransaction`:**
   Al envolver la lógica en `dls.withTransaction(async (tx) => { ... })`, Caerus garantiza que todos los locks adquiridos se liberen automáticamente al concluir el bloque o si ocurre una excepción inesperada, eliminando el riesgo de locks huérfanos.

3. **Detección Proactiva de Ciclos:**
   A diferencia de los bloqueos basados únicamente en expiración de tiempo (TTL timeout), Caerus mantiene un grafo de espera en memoria y aborta inmediatamente la transacción cuando detecta un ciclo dirigido, ahorrando minutos de espera ociosos.
