# 🧪 Guía de Testing - Mobile L (425px)

## 🎯 Objetivo

Verificar que la lista de entes en CumplimientosMesAnio se ve correctamente optimizada en pantallas Mobile L (425px) con:
- ❌ Sin logos
- ✅ Nombre pequeño pero legible
- ✅ Clasificación visible
- ❌ Cumplimientos ocultos
- ✅ Botón "Ver Detalle" grande (44px)

## 📱 Métodos de Testing

### Método 1: Chrome DevTools (Recomendado)

1. **Abre la aplicación:**
   ```bash
   npm run dev
   # http://localhost:5173
   ```

2. **Abre DevTools:**
   - Windows/Linux: `F12` o `Ctrl+Shift+I`
   - Mac: `Cmd+Option+I`

3. **Activa Responsive Mode:**
   - Windows/Linux: `Ctrl+Shift+M`
   - Mac: `Cmd+Shift+M`
   - O click en icono del móvil en DevTools

4. **Selecciona dispositivo Mobile L:**
   - En el dropdown superior, busca "Galaxy S20" (425 × 900)
   - O selecciona "Edit..." > "Add custom device":
     - Name: `Mobile L`
     - Width: `425`
     - Height: `900`
     - Device pixel ratio: `2.75`
   - Presiona "Add" y selecciona el dispositivo

5. **Navega a la vista:**
   ```
   http://localhost:5173/cumplimientos/mes-anio
   ```

6. **Verifica:**
   - [ ] No hay logo
   - [ ] Nombre visible (pequeño)
   - [ ] Clasificación es un badge prominente
   - [ ] Cumplimientos están ocultos
   - [ ] Botón ocupa todo el ancho
   - [ ] Botón tiene mínimo 44px de altura
   - [ ] No hay overflow horizontal
   - [ ] La lista es scrolleable

### Método 2: Firefox Responsive Design Mode

1. **Abre Firefox**

2. **Activa Responsive Design Mode:**
   - Windows/Linux: `Ctrl+Shift+M`
   - Mac: `Cmd+Option+M`
   - O menú: `Tools > Browser Tools > Responsive Design Mode`

3. **Selecciona dispositivo:**
   - Click en "Responsive"
   - Busca y selecciona "Galaxy S20" o "Mobile L"
   - Si no está, click en "Edit list" y agregar custom

4. **Navega:**
   ```
   http://localhost:5173/cumplimientos/mes-anio
   ```

5. **Verifica los puntos anteriores**

### Método 3: Safari (Mac)

1. **Abre Safari**

2. **Habilita Web Inspector:**
   - Menú: `Develop > Show Web Inspector` (o `Cmd+Option+I`)

3. **Activa Responsive Design:**
   - Click en icono de responsive en inspector
   - O `Cmd+Ctrl+R`

4. **Selecciona tamaño:**
   - Click en "Responsive"
   - Busca "Mobile L" o escribe `425 × 900`

5. **Navega y verifica**

### Método 4: Dispositivo Real

#### iPhone 12 Pro Max (428px)
1. Accede a: `http://[tu-ip]:5173/cumplimientos/mes-anio`
2. Si estás en localhost, usa Tunnel o IP local
3. Verifica responsividad

#### Galaxy S20 (425px) - IDEAL
1. Accede a: `http://[tu-ip]:5173/cumplimientos/mes-anio`
2. Perfecto para testing, es exactamente 425px

#### Pixel 5 (432px)
1. Accede a: `http://[tu-ip]:5173/cumplimientos/mes-anio`
2. Muy similar a S20

### Método 5: Visualizar Comparación HTML

1. **Abre archivo de comparación:**
   ```
   c:\laragon\www\siret\MOBILE_L_PREVIEW.html
   ```
   - Doble click en el archivo
   - O arrastra a navegador
   - O: `File > Open` y selecciona el archivo

2. **Verás:**
   - Panel izquierdo: Diseño ANTES
   - Panel derecho: Diseño DESPUÉS
   - Métricas de mejora
   - Recomendaciones

## ✅ Checklist de Verificación

### Visual Checks

- [ ] **Logo**
  - ❌ No se ve logo en 425px
  - ✅ Logo reaparece en 481px+
  - ✅ Logo visible en tablet (768px+)

- [ ] **Nombre del Ente**
  - ✅ Es pequeño pero legible (0.9-1rem)
  - ✅ Font-weight es bold (600)
  - ✅ No está overflow (word-break: break-word)
  - ✅ Crece suavemente en pantallas mayores

- [ ] **Clasificación**
  - ✅ Se ve como un badge prominente
  - ✅ Fondo degradado (#681b32 → #200b07)
  - ✅ Texto blanco
  - ✅ Border-radius 12px
  - ✅ Padding: 0.35rem 0.75rem en Mobile L
  - ✅ Se expande en pantallas mayores

- [ ] **Cumplimientos**
  - ❌ Badges de cumplimientos NO se ven en 425px
  - ✅ Reaparecen en 481px+
  - ✅ Visibles en tablet (768px+)

- [ ] **Botón "Ver Detalle"**
  - ✅ Ocupa 100% del ancho en 425px
  - ✅ Altura mínima 44px
  - ✅ Padding: 0.6rem 0.75rem
  - ✅ Fácil de presionar
  - ✅ Se contrae en 481px+ a ancho automático
  - ✅ Efecto visual al presionar (scale 0.98)

### Layout Checks

- [ ] **Estructura**
  - ✅ Nombre arriba
  - ✅ Clasificación en medio
  - ✅ Botón abajo
  - ✅ Sin logo
  - ✅ Vertical stack en Mobile L

- [ ] **Espaciado**
  - ✅ Padding del item: 0.75rem
  - ✅ Gap entre elementos: 0.5rem-0.75rem
  - ✅ Margin bottom item: 0.75rem
  - ✅ No hay espacios excesivos
  - ✅ No hay overflow horizontal

- [ ] **Responsive**
  - ✅ 375px (iPhone SE): Se ve bien
  - ✅ 425px (Galaxy S20): Se ve excelente
  - ✅ 480px: Transición suave
  - ✅ 481px+: Logo reaparece
  - ✅ 768px+: Layout expandido

### Funcional Checks

- [ ] **Interactividad**
  - ✅ Botón es clickeable/tappable
  - ✅ Al hacer tap en botón se abre modal
  - ✅ Modal se abre sin problemas
  - ✅ Filtros funcionan (año, mes, orden)
  - ✅ Scroll funciona suavemente

- [ ] **Cross-browser**
  - ✅ Chrome/Edge
  - ✅ Firefox
  - ✅ Safari
  - ✅ Mobile browsers (Chrome Android, Safari iOS)

## 📊 Comparación de Tamaños

### Altura del Item

**ANTES:**
```
Logo:        96px
Nombre:      20px
Clasif:      24px
Badges:      20px × 2 = 40px
Botón:       32px
Padding:     16px
TOTAL:       ~130px
```

**DESPUÉS (Mobile L):**
```
Nombre:      16px
Clasif:      16px
(Badges ocultos)
Botón:       44px
Padding:     12px
TOTAL:       ~85px
```

**Ahorro: 45px (-35%)**

### Items Visibles en 600px

```
ANTES:
600 ÷ 130 = 4.6 items → 4 completos + 1 parcial

DESPUÉS:
600 ÷ 85 = 7.0 items → 7 completos ✅
```

**Ganancia: 3 items más visibles (+30%)**

## 🔍 Inspección del DOM

En DevTools puedes inspeccionar:

1. **Elemento:**
   ```
   <div class="entesListMobileL">
     <div class="enteItemMobileL">
       <div class="enteContentMobileL">
         <h5 class="enteNameMobileL">...</h5>
         <p class="classificationBadgeMobileL">...</p>
         <div class="compliancesBadgesMobileL">...</div>
       </div>
       <button class="detailButtonMobileL">Ver detalle</button>
     </div>
   </div>
   ```

2. **CSS Aplicado:**
   - Abre Element Inspector (click derecho > Inspect)
   - Selecciona un elemento
   - En "Styles" verifica clases CSS
   - Busca clases `*MobileL`
   - Verifica media queries

## 🎬 Videos de Testing (Pasos)

### Test Rápido (2 min)

1. F12 → Toggle Device Toolbar → Galaxy S20
2. Navega a /cumplimientos/mes-anio
3. Verifica: No logo, nombre pequeño, button 44px
4. Click en "Ver Detalle"
5. ✅ Done

### Test Completo (10 min)

1. Abre Chrome DevTools
2. Modo Responsive
3. Prueba en 425px:
   - Scroll lista
   - Filtrar por año
   - Filtrar por mes
   - Click en "Ver Detalle"
   - Cierra modal
4. Resize a 481px:
   - Verifica logo reaparece
   - Verifica cumplimientos reaparecen
5. Resize a 768px:
   - Verifica layout expandido
6. Resize a 1024px+:
   - Verifica desktop layout
7. ✅ Done

## 🐛 Solución de Problemas

### Problema: Logo todavía se ve en 425px
**Solución:** 
- Verifica que los estilos CSS se cargaron correctamente
- Abre DevTools > Console
- Escribe: `document.querySelector('.entesListMobileL')`
- Si devuelve `null`, los estilos no se aplicaron
- Intenta `Ctrl+Shift+R` para limpiar cache

### Problema: Botón no tiene 44px
**Solución:**
- Abre DevTools > Inspect Element
- Selecciona el botón
- En "Styles", busca `.detailButtonMobileL`
- Verifica que tenga `min-height: 44px`
- Si no, intenta `Ctrl+Shift+R` para limpiar cache

### Problema: Se ve overflow horizontal
**Solución:**
- Mide el contenedor: DevTools > Inspect > Width
- Verifica que sea < 425px
- Si el padding es muy grande, revisa CSS
- Abre MOBILE_L_OPTIMIZATION.md y verifica valores

### Problema: Responsive transition no es suave
**Solución:**
- Verifica que media query esté en `@media (min-width: 481px)`
- Intenta resize suavemente
- Si hay saltos, revisa si hay `!important` en CSS

## 📸 Screenshots para Documentación

Considera capturar:

1. **425px - ANTES** (si aún tienes branch viejo)
   - Para comparación
   - Mostrar logo, cumplimientos

2. **425px - DESPUÉS** ← NUEVA
   - Sin logo
   - Nombre pequeño
   - Botón prominente
   - Sin cumplimientos

3. **481px** (Transición)
   - Logo reaparece
   - Cumplimientos visibles

4. **768px** (Tablet)
   - Layout expandido
   - Todo visible

## 📋 Reporte de Testing

Cuando completes el testing, reporta:

```markdown
## ✅ Testing Completado

### Dispositivos Probados
- [ ] Chrome 425px
- [ ] Firefox 425px
- [ ] Safari (si Mac)
- [ ] Dispositivo real: [marca/modelo]

### Checks Visuales
- [ ] Logo removido
- [ ] Nombre visible
- [ ] Clasificación prominente
- [ ] Cumplimientos ocultos
- [ ] Botón 44px full-width

### Checks Funcionales
- [ ] Scroll funciona
- [ ] Filtros funcionan
- [ ] Modal abre
- [ ] Responsive transitions suaves

### Resultado
✅ **LISTO PARA PRODUCCIÓN**

### Notas
[Agregar cualquier problema encontrado]
```

## 🎉 Testing Completado

Una vez verifiques todos los puntos:

1. ✅ Cambios están en la rama main
2. ✅ Responsive funciona en todos los breakpoints
3. ✅ No hay broken UI en ningún dispositivo
4. ✅ Funcionalidad original intacta
5. ✅ Accesibilidad mejorada (44px buttons)

**¡Listo para usar en producción!**
