# TransmiGuía

**Trabajo de Grado II - Ingeniería de Sistemas**

Aplicación móvil desarrollada con **React Native + Expo + TypeScript** para apoyar la navegación asistida por voz dentro del sistema **TransMilenio** en Bogotá, con especial enfoque en accesibilidad para personas con discapacidad visual.

---

## Descripción del proyecto

**TransmiGuía** busca acompañar al usuario durante todo el trayecto, no solo mostrarle una ruta. La aplicación permite seleccionar un destino por voz o por texto, identifica la estación más cercana, construye un plan de viaje con caminata, bus y transbordos, y luego entrega indicaciones cortas mediante **voz, vibración y seguimiento contextual**.

El propósito académico del proyecto es diseñar una solución de navegación más accesible, simple y útil en un entorno real de transporte masivo, donde muchas decisiones normalmente dependen de referencias visuales.

---

## Problema que aborda

Usar TransMilenio puede ser retador por la cantidad de estaciones, rutas y transbordos. Para una persona con discapacidad visual, estas dificultades aumentan porque gran parte de la información del sistema se presenta de forma visual o requiere interpretar rápidamente el entorno.

Las aplicaciones de mapas tradicionales ayudan en trayectos generales, pero no siempre acompañan bien dentro del sistema. Por eso, **TransmiGuía** propone una experiencia más cercana a un asistente que escucha, confirma, guía y corrige durante el recorrido.

---

## Funcionalidades principales

- Selección de destino por voz o por entrada manual.
- Confirmación de destino cuando la interpretación es ambigua.
- Detección de estación cercana para iniciar el trayecto.
- Navegación por fases: caminata, ingreso al sistema, trayecto en bus, transbordo y llegada final.
- Alertas por voz y vibración en momentos importantes.
- Detección de usuario perdido o desviado.
- Validación del bus correcto en modo guiado.
- Modo demostración para presentar el flujo completo sin depender del GPS real.

---

## Arquitectura general

El proyecto se organizó de forma modular para separar interfaz, estado global y servicios de apoyo:

- `src/screens/`: pantallas del flujo principal y del modo demo.
- `src/context/`: estado compartido del viaje y del modo demostración.
- `src/services/`: lógica de voz, mapas, ubicación, estaciones y demo.
- `src/hooks/`: hooks reutilizables para ubicación, permisos y control del flujo.
- `src/components/`: componentes visuales y de accesibilidad.
- `android/`: configuración nativa para compilación Android.

Servicios clave:

- `voiceService`: reconocimiento de voz.
- `speechService`: reproducción TTS y cola de mensajes.
- `mapService`: rutas peatonales y apoyo visual del mapa.
- `transmilenioService`: estaciones, corredores, transbordos y plan de viaje.
- `locationService`: GPS y estado de señal.
- `demoService`: simulación controlada para presentaciones y pruebas.

---

## Flujo de navegación

```text
Usuario elige destino
→ la app valida la estación
→ calcula la estación de inicio y el plan del trayecto
→ guía la caminata hasta la estación
→ orienta el abordaje y el recorrido en bus
→ gestiona transbordos si existen
→ anuncia la llegada final
```

---

## Tecnologías utilizadas

| Tecnología | Uso principal |
| --- | --- |
| React Native | Desarrollo móvil |
| Expo | Entorno de ejecución y build |
| TypeScript | Tipado y estructura del proyecto |
| React Navigation | Flujo entre pantallas |
| Expo Speech | Síntesis de voz |
| Expo Speech Recognition | Reconocimiento de voz |
| Expo Location | Ubicación en tiempo real |
| Google Maps SDK | Visualización del mapa en Android |
| Google Directions API | Rutas peatonales hacia estaciones |

---

## Estructura de carpetas

```text
app-transmi-expo/
├── android/
├── assets/
├── src/
│   ├── components/
│   ├── context/
│   ├── hooks/
│   ├── screens/
│   ├── services/
│   └── utils/
├── App.tsx
├── app.config.ts
├── app.json
├── package.json
└── README.md
```

---

## Instalación y ejecución

### Requisitos

- Node.js
- npm
- Android Studio / SDK de Android
- Dispositivo físico Android o emulador

### Pasos

```bash
npm install
npx expo run:android
```

Otros comandos útiles:

```bash
npm run lint
npm run typecheck
```
## Modo demostración

La aplicación incluye un modo demo para mostrar el funcionamiento general sin depender completamente de condiciones reales de calle. Este modo simula:

- selección de destino,
- caminata hacia estación,
- abordaje,
- recorrido en bus,
- transbordos,
- llegada final.

---

## Autor

**Iván Camilo Solano Sánchez**  
**Ingeniería de Sistemas**

---
