# Manual de desarrollo — Fielum

## 1. Visión general y principios

Fielum es un SaaS multi-tenant diseñado para la gestión de mantenimiento recurrente e inspecciones preventivas/correctivas de activos (climatización, electricidad, incendios, etc.).

Antes de escribir una sola línea de código de producto, hay cinco reglas que gobiernan absolutamente todo lo que se construye:

1. **Multi-tenancy desde el primer endpoint**. Cada tabla de negocio lleva `companyId`. Cada query filtra por la empresa del usuario autenticado a través del helper de tenant. Esto no se pospone jamás.
2. **i18n desde el primer componente**. Ningún string de interfaz se queda hardcodeado. Cada componente consume traducciones desde `messages/en.json`, `es.json`, `nl.json` desde el momento en que se crea.
3. **IDs con cuid(), nunca enteros autoincrementales**. Evita la deducción de volumen de registros mirando las URLs.
4. **Cumplimiento de la licencia MIT**. Cualquier estilo o componente reutilizado de `open-fieldservice` conserva el aviso de copyright original.
5. **Formato según el idioma del usuario**. Fechas y moneda se renderizan siempre vía `Intl.NumberFormat`/`Intl.DateTimeFormat` según el locale activo.

---

## 2. Arquitectura

### Stack tecnológico

| Capa | Tecnología | Por qué |
|---|---|---|
| **Frontend** | Next.js 15 (App Router) + React + Tailwind | SSR/SEO para la landing; framework único full-stack |
| **Backend** | Next.js Route Handlers | Un solo despliegue; API integrada |
| **Base de datos** | PostgreSQL + Prisma v7 | Aislamiento multi-tenant concurrente y robusto |
| **Auth** | Supabase Auth | Gestión unificada de identidades y sesiones |
| **Storage** | Supabase Storage | Fotos de evidencias (antes/después) y firmas |
| **i18n** | next-intl | Soporte multilenguaje (NL / EN / ES) sin prefijos |
| **Pagos** | Stripe Payments / Stripe Billing | Cobros a clientes e inscripciones a planes SaaS |

### El helper de tenant (`src/lib/tenant.ts`)

Toda consulta de datos pasa por este helper para resolver el contexto del tenant:

```typescript
export async function getTenantContext() {
  const supabase = await createClient(); // Supabase Server Client
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const user = await prisma.user.findUniqueOrThrow({
    where: { authId: authUser.id },
    include: { company: true }
  });

  return { 
    companyId: user.companyId, 
    userId: user.id, 
    role: user.role, 
    isSuperAdmin: user.isSuperAdmin,
    locale: user.locale
  };
}
```

### Entidades clave del modelo de datos (`prisma/schema.prisma`)

- **Company**: Raíz del tenant (slug, status, plan).
- **User**: Perfil vinculado a Supabase Auth (rol: `OWNER`, `ADMIN`, `DISPATCHER`, `TECHNICIAN`).
- **Customer & Site**: El cliente y sus diferentes locales o edificios cubiertos.
- **Contract**: Acuerdo de mantenimiento recurrente (precios, fechas, y SLA de respuesta en horas).
- **Asset**: Equipos identificados por un código QR único (`qrCode`, marca, modelo, estado).
- **WorkOrder**: Órdenes de trabajo preventivas (revisiones) o correctivas (averías).
- **Evidence**: Fotos de "antes" y "después" subidas por el técnico.
- **AssetReading**: Mediciones operativas tomadas durante la intervención (temperatura, presión).
- **ChecklistItem**: Puntos de verificación de cada orden de trabajo.

---

## 3. Fases de entrega

### Fase 0 — Scaffold ✅ completada
- Next.js 15 + Prisma v7 + Tailwind CSS configurados en la raíz.
- Esquema de base de datos de mantenimiento recurrente definido en `prisma/schema.prisma`.
- Ficheros de traducción `messages/en.json`, `es.json`, `nl.json` inicializados con las nuevas vistas.
- *Criterio de salida*: `npm run dev` arranca sin errores de compilación y Prisma genera el cliente correctamente.

### Fase 1 — Auth y base de multi-tenancy (En curso)
- Integrar Supabase Auth helpers.
- Implementar `getTenantContext()` en `src/lib/tenant.ts`.
- Crear panel `/superadmin` para dar de alta empresas y generar `InvitationToken`.
- Flujo `/activate?token=` para activación del owner de la empresa.
- *Criterio de salida*: El super-admin puede invitar a una empresa, el owner puede activar su cuenta y entrar a un dashboard aislado.

### Fase 2 — Funcionalidad core de mantenimiento
- Dashboard / Torre de Control (contratos, riesgos de SLA, rentabilidad real).
- Vistas de catálogos: Clientes, Ubicaciones (Sites) y Activos con sus códigos QR.
- Órdenes de Trabajo (Creación, asignación y agenda).
- **App de Técnico (Móvil)**: Escaneo QR ficticio/cámara, subida de fotos (antes/después), lecturas de parámetros, checklist y firma canvas.
- **Portal de Cliente (Público)**: `/share/work-order/[id]` con el informe firmado y evidencias.
- *Criterio de salida*: Flujo completo técnico-cliente verificado de extremo a extremo.

### Fase 3 — Internacionalización completa
- Auditoría de formatos regionales en todas las pantallas.

### Fase 4 — Pagos (Stripe)
- Stripe Payments para partes y Stripe Billing para suscripciones de Fielum.

---

## 4. Estrategia de testing

- **Aislamiento multi-tenant**: Comprobar que cualquier consulta de ID de otra empresa (`companyId`) devuelve 404 para evitar que se deduzca su existencia.
- **Flujo funcional**: Test end-to-end de creación de activo -> orden de trabajo -> cierre con firma por el técnico -> visualización de informe por el cliente.
