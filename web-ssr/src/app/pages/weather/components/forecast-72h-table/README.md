# Forecast72hTableComponent

Componente de tabla horizontal que muestra la previsión meteorológica de 72 horas agrupada por días completos.

## Características

### Agrupación por Días

- ✅ Agrupa puntos de previsión horaria en días completos
- ✅ Muestra etiquetas intuitivas: "Hoy", "Mañana", o nombre del día de la semana
- ✅ Resalta la fila del día actual con color de fondo

### Métricas por Día

Cada fila muestra:

- **Temperatura**: Min/Max del día con código de color (rojo para max, azul para min)
- **Nieve acumulada**: Total de cm de nieve esperados en el día
- **Viento máximo**: Velocidad máxima con alerta visual si supera 50 km/h
- **Condición predominante**: Icono y texto descriptivo (Despejado, Nublado, Nevadas, etc.)
- **Confianza**: Badge con color según nivel (alta >80%, media 60-80%, baja <60%)

### Diseño Responsivo

- Tabla scrollable horizontal en móviles
- Columnas adaptativas en desktop
- Estados hover y animaciones suaves

## Uso

```typescript
import { Forecast72hTableComponent } from './forecast-72h-table.component';

@Component({
  imports: [Forecast72hTableComponent],
  template: `
    <app-forecast-72h-table [points]="forecastPoints" />
  `
})
```

## Inputs

| Input    | Tipo                   | Descripción                                     |
| -------- | ---------------------- | ----------------------------------------------- |
| `points` | `MeteoForecastPoint[]` | Array de puntos de previsión horaria (required) |

## Lógica de Agrupación

1. **Agrupación por fecha**: Puntos con la misma fecha (año-mes-día) se agrupan juntos
2. **Cálculo de agregados**:
   - Temperatura: `min()` y `max()` de todos los puntos del día
   - Nieve: `sum()` de precipitación en cm
   - Viento: `max()` de velocidad
   - Confianza: `avg()` de todos los puntos
3. **Condición predominante**: Determina el tipo de clima basándose en totales de precipitación y cobertura nubosa

## Algoritmo de Condición

```
SI nieve > 5cm Y lluvia > 2mm → "Nieve y lluvia"
SI nieve > 2cm → "Nevadas"
SI lluvia > 5mm → "Lluvias"
SI nubes > 70% → "Nublado"
SI nubes > 40% → "Parcialmente nublado"
SINO → "Despejado"
```

## Integración con BLOQUE 1

Este componente **reacciona automáticamente** al selector de cotas global:

- Recibe `store.forecastByCota()` que ya está filtrado por la cota seleccionada
- No necesita lógica adicional de filtrado

## Ejemplo de Datos

```typescript
const exampleDay: DayForecast = {
  date: new Date('2025-10-01'),
  dayLabel: 'Hoy',
  tempMin: -2,
  tempMax: 5,
  snowAccum: 12,
  windMax: 35,
  condition: 'Nevadas',
  conditionIcon: '❄️',
  confidence: 0.85,
  hours: [...] // Puntos horarios originales
};
```

## Mejoras Respecto a Versión Anterior

❌ **Antes**: Mostraba rangos horarios confusos tipo "12:00 to 3:00"  
✅ **Ahora**: Días completos con etiquetas claras (Hoy, Mañana, Lunes 2)

❌ **Antes**: Sin agregación de datos  
✅ **Ahora**: Métricas calculadas por día completo

❌ **Antes**: Difícil de entender de un vistazo  
✅ **Ahora**: Tabla clara con iconos, colores y badges de confianza
