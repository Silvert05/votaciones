# Sistema de votación electrónica 🗳️

Monorepo construido con **pnpm** y **Turborepo**. Incluye:

- `apps/web/`: frontend en Angular 22
- `apps/api/`: API en NestJS 11 con Prisma

## Tecnologías 🛠️

- **Frontend:** Angular 22, TypeScript, Angular Material, Tailwind CSS
- **Backend:** NestJS 11, TypeScript, JWT/Passport, Prisma, PostgreSQL, Jest
- **Herramientas:** pnpm 10, Turborepo 2, ESLint, Prettier

## Requisitos previos

- Node.js 24+
- PostgreSQL 17+
- pnpm instalado
- Base de datos configurada para Prisma en `apps/api/`

## Instalación

```bash
pnpm install
```

## Levantar el monorepo

Para iniciar ambas aplicaciones en modo desarrollo:

```bash
pnpm dev
```

Este comando ejecuta Turbo y levanta:

- la app de Angular con `ng serve`
- la API de NestJS en modo watch

## Levantar cada app por separado

Frontend:

```bash
pnpm -C apps/web dev
```

Backend:

```bash
pnpm -C apps/api dev
```

## Comandos comunes

```bash
pnpm build      # compila todos los paquetes del workspace
pnpm lint       # ejecuta lint en el monorepo
pnpm -C apps/api test
pnpm -C apps/api test:cov
pnpm -C apps/api test:e2e
pnpm -C apps/api db:generate
pnpm -C apps/api db:migrate
```

## Manual operativo

Puedes seguir el flujo completo del sistema en [docs/manual-flujo-completo.md](docs/manual-flujo-completo.md).

## Créditos 👨🏻‍💻

- [Jhon Guacho](https://github.com/guachodev) (Desarrollador)
