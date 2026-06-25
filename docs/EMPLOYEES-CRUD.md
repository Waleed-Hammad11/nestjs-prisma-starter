# 🏗️ Employee CRUD Module — NestJS + Prisma + PostgreSQL

## الدليل الشامل: Architecture، Best Practices، أكواد، وخطوات التنفيذ

> **المشروع:** `first-project`
> **التقنيات:** NestJS 11 + Prisma 7 + PostgreSQL + TypeScript
> **التاريخ:** يونيو 2026

---

## 📑 فهرس المحتويات

1. [أنواع الـ Architectures في NestJS](#1-أنواع-الـ-architectures-في-nestjs)
2. [ليه اختارنا Modular Layered Architecture](#2-ليه-اختارنا-modular-layered-architecture)
3. [هيكل الملفات النهائي](#3-هيكل-الملفات-النهائي)
4. [الملفات الموجودة حاليًا (تحليل)](#4-الملفات-الموجودة-حاليًا)
5. [Best Practices المطبقة](#5-best-practices-المطبقة)
6. [شرح مفصل لكل ملف وكود](#6-شرح-مفصل-لكل-ملف-وكود)
7. [خطوات التنفيذ — واحدة واحدة](#7-خطوات-التنفيذ)
8. [الـ API Endpoints](#8-الـ-api-endpoints)
9. [Testing](#9-testing)
10. [أخطاء شائعة وحلولها](#10-أخطاء-شائعة-وحلولها)
11. [التحسينات المستقبلية](#11-التحسينات-المستقبلية)

---

## 1. أنواع الـ Architectures في NestJS

### 1.1 جدول مقارنة شامل

| النوع | الوصف | المميزات | العيوب | مناسب لـ |
|-------|-------|----------|--------|----------|
| **Layered Architecture** | Controller → Service → Repository (أو Prisma) | بسيطة، سهلة الفهم، سريعة التطوير | بتتعقد مع كبر المشروع، coupling عالي | المشاريع البسيطة والـ MVPs |
| **Modular Architecture** | كل Feature في Module مستقل | NestJS native، قابلة للتوسع، منظمة | ممكن تكون repetitive لو الـ Features متشابهة | أي حجم مشروع |
| **Modular Layered** ✅ | Modules + Layers جوا كل Module | أفضل تنظيم + فصل مسؤوليات واضح | أكتر شوية من الـ Pure Layered | المشاريع المتوسطة (اختيارنا) |
| **Clean / Hexagonal** | Domain → Application → Infrastructure → Presentation | فصل كامل، testability عالية، مرنة | Over-engineering للمشاريع الصغيرة، كتير ملفات | المشاريع الكبيرة المعقدة |
| **CQRS** | فصل الـ Read عن الـ Write | أداء عالي، scalability ممتازة | تعقيد عالي، eventual consistency | أنظمة الـ Business Logic المعقد |
| **DDD** | Domain-Driven Design | نمذجة دقيقة للـ Business | منحنى تعلم عالي، يحتاج فريق خبير | الفرق الكبيرة والمجالات المعقدة |
| **Microservices** | كل Service مستقلة تماماً | scalability لا محدودة | تعقيد البنية التحتية، DevOps overhead | الأنظمة الضخمة |

### 1.2 تفصيل كل Architecture

#### 🔵 Layered Architecture (الطبقات)

```
Request → Controller → Service → Repository → Database
                                      ↑
                              (Prisma هنا بيلعب دور الـ Repository)
```

**الفكرة:** كل طبقة ليها مسؤولية واحدة:
- **Controller**: استقبال الـ HTTP Request وإرجاع الـ Response
- **Service**: الـ Business Logic
- **Repository**: التعامل مع قاعدة البيانات

**المشكلة:** في المشاريع الكبيرة، كل الـ Services بتكون في مكان واحد وبتعتمد على بعض → **Spaghetti Code**

---

#### 🟢 Modular Architecture (NestJS Native)

```
AppModule
├── UsersModule
│   ├── UsersController
│   └── UsersService
├── ProductsModule
│   ├── ProductsController
│   └── ProductsService
└── OrdersModule
    ├── OrdersController
    └── OrdersService
```

**الفكرة:** كل Feature في Module مستقل، الـ Module بيحدد:
- **imports**: الـ Modules اللي بيعتمد عليها
- **controllers**: الـ Controllers اللي بيقدمها
- **providers**: الـ Services والـ Repositories
- **exports**: اللي بيشاركه مع Modules تانية

**ليه NestJS بنى عليها؟**
- Angular-inspired architecture
- كل Module زي **صندوق أسود** — بيخبي التفاصيل الداخلية
- **Dependency Injection** بتخلي كل حاجة testable ومعزولة

---

#### 🟣 Clean / Hexagonal Architecture

```
┌───────────────────────────────────┐
│         Presentation Layer        │  ← Controllers, DTOs
│  ┌─────────────────────────────┐  │
│  │     Application Layer       │  │  ← Use Cases, Commands
│  │  ┌───────────────────────┐  │  │
│  │  │    Domain Layer       │  │  │  ← Entities, Value Objects
│  │  └───────────────────────┘  │  │
│  └─────────────────────────────┘  │
│       Infrastructure Layer        │  ← Prisma, External APIs
└───────────────────────────────────┘
```

**ليه ما اخترناهاش؟**
- المشروع لسه صغير، Employee model واحد
- هتحتاج ملفات كتير: Entity، Repository Interface، Repository Implementation، Use Case، DTO، Mapper...
- لما المشروع يكبر (5+ models مع Business Logic معقد) → نقدر نحول

---

#### 🔴 CQRS (Command Query Responsibility Segregation)

```
┌─────────┐     ┌──────────────┐     ┌──────────┐
│ Command │ ──→ │ Command Bus  │ ──→ │ Write DB │
└─────────┘     └──────────────┘     └──────────┘

┌─────────┐     ┌──────────────┐     ┌──────────┐
│  Query  │ ──→ │  Query Bus   │ ──→ │ Read DB  │
└─────────┘     └──────────────┘     └──────────┘
```

**ليه ما اخترناهاش؟**
- مفيش فصل بين Read و Write في الـ Use Case بتاعنا
- Over-kill لـ CRUD بسيط
- NestJS عنده `@nestjs/cqrs` package لو احتجناه بعدين

---

## 2. ليه اختارنا Modular Layered Architecture

### 2.1 الأسباب التقنية

```
✅ NestJS مبني عليها أصلاً
   └── كل أداة (Guards, Pipes, Interceptors) مصممة للـ Modules

✅ مناسبة لحجم المشروع
   └── مش Over-engineering — Employee CRUD بسيط

✅ قابلة للتوسع
   └── كل Feature جوا Module لوحدها
   └── تقدر تضيف DepartmentsModule, AuthModule بسهولة

✅ سهولة الاختبار
   └── EmployeesController → يعتمد على EmployeesService (Mock it)
   └── EmployeesService → يعتمد على PrismaService (Mock it)

✅ قابلة للتطوير
   └── لو كبر المشروع → نحولها لـ Clean Architecture
   └── لو احتجنا Event Sourcing → نضيف CQRS

✅ PrismaService موجود كـ Global Module
   └── أي Module يقدر يستخدمه من غير إعادة تعريف
```

### 2.2 الـ Data Flow (تدفق البيانات)

```
Client (Postman/Frontend)
    │
    ▼
┌──────────────────────────────────────────────────────┐
│  main.ts                                             │
│  ├── ValidationPipe (whitelist, transform)            │
│  ├── GlobalPrefix('api')                             │
│  └── CORS enabled                                    │
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│  EmployeesController                                 │
│  ├── @Post()    → create()   → Body: CreateDto       │
│  ├── @Get()     → findAll()  → No params             │
│  ├── @Get(':id')→ findOne()  → Param: id (ParseInt)  │
│  ├── @Patch(':id')→ update() → Param + Body: UpdateDto│
│  └── @Delete(':id')→ remove()→ Param: id (ParseInt)  │
│                                                      │
│  المسؤولية: HTTP Layer فقط                           │
│  ─ استقبال Request                                   │
│  ─ Validation (عن طريق Pipes)                        │
│  ─ إرجاع Response                                   │
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│  EmployeesService                                    │
│  ├── create()  → prisma.employee.create()            │
│  ├── findAll() → prisma.employee.findMany()          │
│  ├── findOne() → prisma.employee.findUnique()        │
│  │               └── if !found → throw NotFoundException│
│  ├── update()  → findOne() check → prisma.update()   │
│  └── remove()  → findOne() check → prisma.delete()   │
│                                                      │
│  المسؤولية: Business Logic                           │
│  ─ التحقق من وجود البيانات                           │
│  ─ رمي الـ Exceptions المناسبة                       │
│  ─ تنفيذ العمليات                                   │
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│  PrismaService (extends PrismaClient)                │
│  ├── onModuleInit()   → $connect()                   │
│  └── onModuleDestroy()→ $disconnect()                │
│                                                      │
│  المسؤولية: Database Access Layer                    │
│  ─ إدارة الاتصال بقاعدة البيانات                    │
│  ─ توفير الـ Type-safe queries                       │
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│  PostgreSQL Database                                 │
│  └── Employee Table                                  │
│      ├── id        (SERIAL PRIMARY KEY)              │
│      ├── name      (VARCHAR)                         │
│      ├── email     (VARCHAR UNIQUE)                  │
│      ├── role      (ENUM: INTERN, ENGINEER, ADMIN)   │
│      ├── createdAt (TIMESTAMP DEFAULT now())         │
│      └── updatedAt (TIMESTAMP auto-update)           │
└──────────────────────────────────────────────────────┘
```

---

## 3. هيكل الملفات النهائي

```
first-project/
├── prisma/
│   ├── migrations/           ← Migration files (موجود)
│   └── schema.prisma         ← Database schema (موجود ✅)
├── generated/
│   └── prisma/               ← Generated Prisma Client (موجود ✅)
├── src/
│   ├── prisma/
│   │   ├── prisma.module.ts  ← Global Module (موجود ✅)
│   │   └── prisma.service.ts ← PrismaClient wrapper (موجود ✅)
│   ├── employees/                        ← 🆕 Employee Feature Module
│   │   ├── dto/
│   │   │   ├── create-employee.dto.ts    ← 🆕 Input validation for Create
│   │   │   └── update-employee.dto.ts    ← 🆕 Input validation for Update
│   │   ├── employees.controller.ts       ← 🆕 HTTP endpoints
│   │   ├── employees.controller.spec.ts  ← 🆕 Controller unit tests
│   │   ├── employees.service.ts          ← 🆕 Business logic
│   │   ├── employees.service.spec.ts     ← 🆕 Service unit tests
│   │   └── employees.module.ts           ← 🆕 Module definition
│   ├── app.controller.ts    ← (موجود ✅)
│   ├── app.module.ts        ← (موجود ✅ — هيتعدل)
│   ├── app.service.ts       ← (موجود ✅)
│   └── main.ts              ← (موجود ✅)
├── .env                      ← (موجود ✅)
├── package.json              ← (موجود ✅)
├── prisma.config.ts          ← (موجود ✅)
└── docs/
    └── EMPLOYEES-CRUD.md     ← 📄 الملف دا!
```

---

## 4. الملفات الموجودة حاليًا (تحليل)

### 4.1 `main.ts` — نقطة البداية

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix('api');
  app.enableCors();
  await app.listen(configService.get<number>('PORT') ?? 3000);
}

bootstrap();
```

#### شرح كل سطر ولماذا:

| السطر | الكود | الشرح | ليه كدا؟ |
|-------|-------|-------|----------|
| 1 | `NestFactory` | Factory Pattern لإنشاء الـ App | NestJS بيستخدم Factory Pattern عشان يبني الـ Application instance |
| 2 | `AppModule` | الـ Root Module | كل NestJS app لازم يكون فيه Root Module واحد بيربط كل حاجة |
| 3 | `ConfigService` | خدمة إدارة الـ Environment Variables | بدل `process.env` مباشرة — type-safe وقابلة للاختبار |
| 4 | `ValidationPipe` | أنبوب التحقق من المدخلات | بيطبق الـ Validation على كل الـ DTOs تلقائياً |
| 8 | `configService.get(ConfigService)` | جلب الـ ConfigService من الـ DI Container | عشان نستخدمه لقراءة PORT من `.env` |
| 11 | `whitelist: true` | شيل أي حقول مش موجودة في الـ DTO | **Security**: لو حد بعت `isAdmin: true` والـ DTO مفيهاش، هتتشال |
| 12 | `forbidNonWhitelisted: true` | ارمي Error لو في حقول زيادة | أقوى من `whitelist` — مش بس بتشيل، بترمي 400 Error |
| 13 | `transform: true` | حول الأنواع تلقائياً | `"5"` في الـ URL → `5` number في الكود |
| 16 | `setGlobalPrefix('api')` | كل الـ Endpoints تبدأ بـ `/api` | **Best Practice**: API versioning وفصل عن الـ Frontend |
| 17 | `enableCors()` | تفعيل Cross-Origin Resource Sharing | عشان الـ Frontend (لو في domain تاني) يقدر يكلم الـ API |
| 18 | `configService.get('PORT') ?? 3000` | بيقرأ PORT من `.env` أو يستخدم 3000 | Nullish coalescing — لو PORT مش موجود يستخدم الـ default |

#### ليه `ValidationPipe` Global وليه مش على كل Controller؟

```
❌ الطريقة السيئة:
@Controller('employees')
export class EmployeesController {
  @Post()
  @UsePipes(new ValidationPipe())     ← لازم تضيفها على كل Method
  create(@Body() dto: CreateEmployeeDto) {}
}

✅ الطريقة الصح (اللي عملناها):
// main.ts
app.useGlobalPipes(new ValidationPipe({...}));
// كدا كل الـ DTOs في كل الـ Controllers هتتحقق تلقائياً
```

**السبب:** DRY Principle — Don't Repeat Yourself

---

### 4.2 `prisma/schema.prisma` — تعريف قاعدة البيانات

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
}

enum Role {
  INTERN
  ENGINEER
  ADMIN
}

model Employee {
  id        Int      @id @default(autoincrement())
  name      String
  email     String   @unique
  role      Role
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

#### شرح كل جزء:

**`generator client`:**
```prisma
generator client {
  provider = "prisma-client"    ← بيولد TypeScript client
  output   = "../generated/prisma"  ← المكان اللي هيتحط فيه الكود المولّد
}
```
- **ليه `output` مخصص؟** عشان نحافظ على نظافة الـ `src/` folder ونفصل الكود المولّد عن كود المشروع
- **ليه `"prisma-client"` وليه مش `"prisma-client-js"`؟** Prisma 7 غيّرت الاسم — الجديد أبسط

**`datasource db`:**
```prisma
datasource db {
  provider = "postgresql"   ← نوع قاعدة البيانات
  // الـ URL بيتاخد من prisma.config.ts مش هنا
}
```
- **ليه مفيش `url` هنا؟** في Prisma 7، الـ `prisma.config.ts` بيتحكم في الـ connection string
- **ليه PostgreSQL وليه مش MySQL؟**
  - Better support for Enums (native)
  - Better JSON support
  - Better concurrent access
  - Industry standard for production apps

**`enum Role`:**
```prisma
enum Role {
  INTERN
  ENGINEER
  ADMIN
}
```
- **ليه Enum وليه مش String؟**
  - **Data Integrity**: ماينفعش حد يدخل `"super_admin"` أو `"enginner"` (typo)
  - **Performance**: Enum في PostgreSQL بيتخزن كـ integer داخلياً → أسرع في الـ queries
  - **Type Safety**: Prisma بيولّد TypeScript enum → الـ IDE بيعطيك autocomplete
  - **Documentation**: بمجرد ما تشوف الـ Schema تعرف القيم المسموحة

**`model Employee`:**
```prisma
model Employee {
  id        Int      @id @default(autoincrement())
  name      String
  email     String   @unique
  role      Role
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

| الحقل | النوع | الـ Attributes | ليه كدا؟ |
|-------|-------|---------------|----------|
| `id` | `Int` | `@id @default(autoincrement())` | Primary Key يزيد تلقائياً — أبسط من UUID للمشاريع البسيطة |
| `name` | `String` | — | اسم الموظف — مفيش `@unique` لأن ممكن يكون في موظفين بنفس الاسم |
| `email` | `String` | `@unique` | لازم يكون فريد — ماينفعش موظفين بنفس الإيميل |
| `role` | `Role` | — | مرجع للـ Enum — محدود بالقيم المسموحة |
| `createdAt` | `DateTime` | `@default(now())` | بيتملي تلقائياً وقت الإنشاء — Audit Trail |
| `updatedAt` | `DateTime` | `@updatedAt` | بيتحدث تلقائياً مع كل Update — Audit Trail |

#### ليه `Int` وليه مش `UUID`؟

| المعيار | `Int (autoincrement)` | `UUID` |
|---------|----------------------|--------|
| الأداء | أسرع في الـ Indexing | أبطأ (128-bit) |
| الحجم | 4 bytes | 16 bytes |
| الترتيب | مرتب تلقائياً | عشوائي |
| الأمان | ممكن تتوقع الـ ID التالي | غير قابل للتوقع |
| مناسب لـ | Internal APIs, MVPs | Public APIs, Distributed Systems |

**اختيارنا:** `Int` — لأن المشروع internal ولسه في مرحلة التطوير. لو احتجنا نحوّل لـ UUID بعدين، migration واحد يكفي.

---

### 4.3 `src/prisma/prisma.service.ts` — الـ Database Layer

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private configService: ConfigService) {
    const connectionString = configService.get<string>('DATABASE_URL');
    const adapter = new PrismaPg({ connectionString });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

#### شرح مفصل:

**`extends PrismaClient`:**
- الـ PrismaService **بيرث** من PrismaClient
- معنى كدا: `this.prisma.employee.findMany()` شغالة مباشرة
- **ليه Inheritance وليه مش Composition؟**
  - Inheritance أبسط — مش محتاج تعمل wrapper لكل method
  - الـ PrismaClient مصمم عشان يتورث
  - لو استخدمنا Composition: كنا هنحتاج نعمل `this.prismaClient.employee.findMany()` وده verbose

**`implements OnModuleInit, OnModuleDestroy`:**
- **Lifecycle Hooks** — NestJS بيناديهم تلقائياً:
  - `onModuleInit()`: لما الـ Module يتحمّل → نفتح الاتصال بالـ DB
  - `onModuleDestroy()`: لما الـ App يتقفل → نقفل الاتصال بالـ DB
- **ليه مش بنعمل `$connect()` في الـ Constructor؟**
  - Constructor لازم يكون **synchronous**
  - `$connect()` هو **async** operation
  - NestJS Lifecycle Hooks بتدعم async

**`PrismaPg` Adapter:**
```typescript
const adapter = new PrismaPg({ connectionString });
super({ adapter });
```
- **Prisma 7 جديد**: Driver Adapters
- بيستخدم `pg` package مباشرة بدل الـ built-in engine
- **الفايدة**: أقل memory، أسرع cold start، better connection pooling

---

### 4.4 `src/prisma/prisma.module.ts` — الـ Global Module

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

#### ليه `@Global()`؟

```
بدون @Global():
─────────────────
EmployeesModule
  imports: [PrismaModule]  ← لازم تستورده في كل Module

UsersModule
  imports: [PrismaModule]  ← ولازم هنا كمان

OrdersModule
  imports: [PrismaModule]  ← وهنا كمان

────────────────────────────────
مع @Global():
─────────────────
AppModule
  imports: [PrismaModule]  ← مرة واحدة بس في الـ Root

EmployeesModule             ← يقدر يستخدم PrismaService تلقائياً ✅
UsersModule                 ← يقدر يستخدم PrismaService تلقائياً ✅
OrdersModule                ← يقدر يستخدم PrismaService تلقائياً ✅
```

**Best Practice:** استخدم `@Global()` بس للـ Services اللي كل الـ App محتاجها (Database, Config, Logger). ما تستخدمهاش لكل حاجة عشان ما تضيّعش الـ Encapsulation.

---

## 5. Best Practices المطبقة

### 5.1 Separation of Concerns (فصل المسؤوليات)

```
┌─────────────────────────────────────────────────────────┐
│ الطبقة          │ المسؤولية              │ ممنوع تعمل    │
├─────────────────┼────────────────────────┼───────────────┤
│ Controller      │ HTTP handling          │ Database calls│
│ Service         │ Business logic         │ HTTP concerns │
│ DTO             │ Input validation       │ Business logic│
│ Prisma Model    │ Response shape (auto)  │ Validation    │
│ PrismaService   │ Database access        │ Business logic│
└─────────────────────────────────────────────────────────┘
```

**مثال على الانتهاك:**
```typescript
// ❌ غلط — الـ Controller بيعمل Database call مباشرة
@Controller('employees')
export class EmployeesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  findAll() {
    return this.prisma.employee.findMany(); // ← خطأ!
  }
}

// ✅ صح — الـ Controller بيكلم الـ Service
@Controller('employees')
export class EmployeesController {
  constructor(private employeesService: EmployeesService) {}

  @Get()
  findAll() {
    return this.employeesService.findAll(); // ← صح!
  }
}
```

**ليه مهم؟**
1. لو غيرت الـ Database (من Prisma لـ TypeORM) → تغير الـ Service بس
2. لو عايز تضيف Caching → تضيفه في الـ Service بس
3. Testing: تقدر تعمل Mock للـ Service من غير ما تحتاج Database

---

### 5.2 DTO Pattern (Data Transfer Object)

```
ليه DTO منفصل عن الـ Prisma Model؟
─────────────────────────────────────────

Client Request → CreateEmployeeDto (Input Shape)
                 { name, email, role }
                 ↓
                 Validation (class-validator)
                 ↓
                 Service processes it
                 ↓
Database ← Prisma creates record
                 ↓
                 Prisma Generated Type (Output Shape)
                 { id, name, email, role, createdAt, updatedAt }
                 ↓
Client Response ← JSON
```

**ليه مش نستخدم نفس الـ Class للاتنين؟**
- **الـ Input مختلف عن الـ Output**: الـ Client ما يبعتش `id` أو `createdAt`
- **Security**: لو استخدمنا نفس الـ Class، ممكن حد يبعت `id: 1` ويغير الـ Primary Key
- **Prisma Model type-safe أصلاً**: الـ return type من Prisma queries بيكون متزامن مع الـ Schema تلقائياً

---

### 5.3 Error Handling Strategy

```typescript
// ليه NotFoundException وليه مش throw new Error()؟

// ❌ غلط — Error عام هيرجع 500 Internal Server Error
async findOne(id: number) {
  const employee = await this.prisma.employee.findUnique({ where: { id } });
  if (!employee) throw new Error('Not found');  // ← 500!
  return employee;
}

// ✅ صح — NotFoundException بيرجع 404 تلقائياً
async findOne(id: number) {
  const employee = await this.prisma.employee.findUnique({ where: { id } });
  if (!employee) throw new NotFoundException(`Employee #${id} not found`);
  return employee;  // ← 404 مع رسالة واضحة
}
```

**NestJS HTTP Exceptions:**

| الـ Exception | الـ Status Code | متى تستخدمه |
|---------------|----------------|-------------|
| `BadRequestException` | 400 | Input validation errors |
| `UnauthorizedException` | 401 | مش مسجل دخول |
| `ForbiddenException` | 403 | ما عندوش صلاحية |
| `NotFoundException` | 404 | الـ Resource مش موجود |
| `ConflictException` | 409 | Duplicate entry (مثلاً email مكرر) |
| `InternalServerErrorException` | 500 | خطأ داخلي (ما تستخدمهاش — NestJS بيرميها تلقائياً) |

---

### 5.4 ParseIntPipe — Type Safety في الـ URL

```typescript
// ❌ بدون ParseIntPipe — id هيكون string
@Get(':id')
findOne(@Param('id') id: string) {
  return this.employeesService.findOne(parseInt(id));  // ← يدوي!
  // لو id = "abc" → parseInt("abc") = NaN → خطأ في الـ DB!
}

// ✅ مع ParseIntPipe — id هيكون number أو Error
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {
  return this.employeesService.findOne(id);
  // لو id = "abc" → 400 Bad Request تلقائياً
  // لو id = "5" → يتحول لـ number 5 تلقائياً
}
```

---

### 5.5 Dependency Injection (حقن التبعيات)

```
ليه NestJS بيستخدم Dependency Injection؟
────────────────────────────────────────

بدون DI:
class EmployeesService {
  private prisma = new PrismaService();  // ← Hard-coded dependency
  // ما تقدرش تعمل Mock في الـ Tests
  // لو PrismaService غيرت الـ Constructor → لازم تغير هنا
}

مع DI:
@Injectable()
class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}
  // NestJS بيعمل inject تلقائياً
  // في الـ Tests: بتعطيه Mock بدل الـ Real Service
  // لو PrismaService غيرت → مش محتاج تغير هنا
}
```

**الـ `readonly` keyword:**
```typescript
constructor(private readonly prisma: PrismaService) {}
//                 ^^^^^^^^
// معنى readonly:
// ✅ this.prisma.employee.findMany()  ← تقدر تستخدمه
// ❌ this.prisma = new PrismaService() ← ما تقدرش تغيره
// الفايدة: بيحمي من الأخطاء غير المقصودة
```

---

## 6. شرح مفصل لكل ملف وكود

### 6.1 `src/employees/dto/create-employee.dto.ts`

```typescript
import { IsString, IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { Role } from '../../generated/prisma/client';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;
}
```

#### شرح الـ Decorators:

| الـ Decorator | الوظيفة | مثال على الخطأ |
|---------------|---------|---------------|
| `@IsString()` | لازم يكون نص | `name: 123` → ❌ |
| `@IsNotEmpty()` | ما ينفعش يكون فاضي | `name: ""` → ❌ |
| `@IsEmail()` | لازم يكون بصيغة إيميل | `email: "abc"` → ❌ |
| `@IsEnum(Role)` | لازم يكون من القيم المحددة | `role: "SUPER"` → ❌ |

#### مثال على الـ Validation Error Response:

```json
// POST /api/employees
// Body: { "name": "", "email": "not-email", "role": "INVALID" }

{
  "statusCode": 400,
  "message": [
    "name should not be empty",
    "email must be an email",
    "role must be one of the following values: INTERN, ENGINEER, ADMIN"
  ],
  "error": "Bad Request"
}
```

#### ليه `class-validator` وليه مش `zod` أو `joi`؟

| المكتبة | الأسلوب | التكامل مع NestJS | ليه نستخدمها |
|---------|---------|-------------------|-------------|
| `class-validator` | Decorator-based | Native (ValidationPipe) | ✅ الأفضل مع NestJS |
| `zod` | Schema-based | يحتاج Custom Pipe | مناسب لـ tRPC / standalone |
| `joi` | Schema-based | يحتاج Custom Pipe | قديمة، مش TypeScript-first |

---

### 6.2 `src/employees/dto/update-employee.dto.ts`

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateEmployeeDto } from './create-employee.dto';

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {}
```

#### ليه `PartialType`؟

```
CreateEmployeeDto:
  name: string     ← Required
  email: string    ← Required
  role: Role       ← Required

PartialType(CreateEmployeeDto) = UpdateEmployeeDto:
  name?: string    ← Optional
  email?: string   ← Optional
  role?: Role      ← Optional

الفايدة:
─ ما تحتاجش تعيد كتابة الحقول
─ لو ضفت حقل جديد في CreateDto → هيظهر تلقائياً في UpdateDto
─ DRY Principle
```

#### ليه `@nestjs/mapped-types` وليه مش `@nestjs/swagger`؟

| المكتبة | الاستخدام | متى تستخدمها |
|---------|-----------|-------------|
| `@nestjs/mapped-types` | DTOs فقط | لما مش محتاج Swagger |
| `@nestjs/swagger` | DTOs + Swagger documentation | لما عايز API documentation |

> **ملاحظة:** `@nestjs/swagger` عنده نفس الـ `PartialType` + بيضيف Swagger metadata. لو حبينا نضيف Swagger بعدين، نغير الـ import بس.

---

### 6.3 ليه بنستخدم Prisma Types مباشرة بدل Entity Class؟

#### القرار: ❌ مفيش `entities/` folder — ✅ بنستخدم Prisma Generated Types

```
الطريقة التقليدية (مش بنستخدمها):
──────────────────────────────────
src/employees/entities/employee.entity.ts   ← ملف إضافي
  ↓
  class Employee { id, name, email, role, createdAt, updatedAt }
  ↓
  نفس الحقول الموجودة في Prisma Model! → تكرار بدون فايدة

الطريقة بتاعتنا (Prisma Types مباشرة):
────────────────────────────────────────
Prisma Schema → prisma generate → TypeScript Types جاهزة
  ↓
  import { Employee } from '../../generated/prisma/client';
  ↓
  Type-safe + متزامن مع الـ Database تلقائياً
```

#### ليه مش محتاجين Entity Class؟

| المعيار | Entity Class منفصلة | Prisma Generated Types |
|---------|--------------------|-----------------------|
| **التكرار** | نفس الحقول مكررة في مكانين | مكان واحد (schema.prisma) |
| **التزامن** | لو غيرت الـ Schema لازم تغير الـ Entity يدوي | بيتحدث تلقائياً مع `prisma generate` |
| **Type Safety** | ممكن تغلط في النوع | 100% type-safe من الـ Generator |
| **الصيانة** | ملف إضافي لكل Model | صفر ملفات إضافية |
| **Boilerplate** | كتير | صفر |

#### الـ Prisma Generated Type شكله إيه؟

```typescript
// الملف دا بيتولّد تلقائياً في generated/prisma/client
// مش محتاج تكتبه يدوي!

type Employee = {
  id: number;
  name: string;
  email: string;
  role: $Enums.Role;
  createdAt: Date;
  updatedAt: Date;
}
```

#### استخدامه في الكود:

```typescript
import { Employee } from '../../generated/prisma/client';

// الـ Service بيرجع Prisma type مباشرة
async findAll(): Promise<Employee[]> {
  return this.prisma.employee.findMany();
  // الـ return type هنا هو Employee[] تلقائياً ✅
}
```

#### امتى نحتاج Entity Class منفصلة؟

> **القاعدة:** استخدم Prisma Types مباشرة إلا لو:
> 1. عايز تخبي حقول من الـ Response (`@Exclude()` مع `class-transformer`)
> 2. عايز تحول شكل البيانات (`@Transform()`)
> 3. عايز تضيف حقول محسوبة (`@Expose()` مثلاً `fullName`)
> 4. عايز تفصل الـ API layer عن الـ Database layer تماماً (Clean Architecture)
>
> في المشروع الحالي مش محتاجين أي حاجة من دول → Prisma Types كافية ✅

---

### 6.4 `src/employees/employees.service.ts`

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Employee } from '../../generated/prisma/client';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createEmployeeDto: CreateEmployeeDto): Promise<Employee> {
    return this.prisma.employee.create({ data: createEmployeeDto });
  }

  async findAll(): Promise<Employee[]> {
    return this.prisma.employee.findMany();
  }

  async findOne(id: number): Promise<Employee> {
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) throw new NotFoundException(`Employee #${id} not found`);
    return employee;
  }

  async update(id: number, updateEmployeeDto: UpdateEmployeeDto): Promise<Employee> {
    await this.findOne(id);
    return this.prisma.employee.update({
      where: { id },
      data: updateEmployeeDto,
    });
  }

  async remove(id: number): Promise<Employee> {
    await this.findOne(id);
    return this.prisma.employee.delete({ where: { id } });
  }
}
```

#### شرح كل Method بالتفصيل:

**`create()`:**
```typescript
async create(createEmployeeDto: CreateEmployeeDto): Promise<Employee> {
  return this.prisma.employee.create({ data: createEmployeeDto });
}
```
- `this.prisma.employee` → Prisma Model access (type-safe)
- `.create({ data: ... })` → INSERT INTO employees ...
- الـ DTO بيتمرر مباشرة كـ `data` لأن الحقول متطابقة
- **ليه مفيش try/catch؟** لأن:
  - الـ Validation بيحصل في الـ Controller (عن طريق ValidationPipe)
  - لو حصل Unique constraint violation (email مكرر) → Prisma هيرمي Error → NestJS هيحوله لـ 500
  - ممكن نحسن دا بـ Exception Filter بعدين (هنشرح في التحسينات)

**`findAll()`:**
```typescript
async findAll(): Promise<Employee[]> {
  return this.prisma.employee.findMany();
}
```
- `.findMany()` → SELECT * FROM employees
- بترجع Array فاضي `[]` لو مفيش بيانات (مش Error)
- **تحسين مستقبلي:** Pagination → `findMany({ skip: 0, take: 10 })`

**`findOne()`:**
```typescript
async findOne(id: number): Promise<Employee> {
  const employee = await this.prisma.employee.findUnique({ where: { id } });
  if (!employee) throw new NotFoundException(`Employee #${id} not found`);
  return employee;
}
```
- `.findUnique({ where: { id } })` → SELECT * FROM employees WHERE id = ?
- **ليه `findUnique` وليه مش `findFirst`؟**
  - `findUnique`: يبحث بـ `@id` أو `@unique` fields فقط → أسرع
  - `findFirst`: يبحث بأي field → أبطأ
- **ليه نرمي `NotFoundException`؟** عشان الـ Client يعرف إن الـ ID مش موجود (404) بدل ما يفتكر فيه Server Error (500)

**`update()`:**
```typescript
async update(id: number, updateEmployeeDto: UpdateEmployeeDto): Promise<Employee> {
  await this.findOne(id);  // ← Step 1: تأكد إنه موجود
  return this.prisma.employee.update({
    where: { id },
    data: updateEmployeeDto,
  });
}
```
- **ليه `await this.findOne(id)` الأول؟**
  - Prisma `update()` لو الـ ID مش موجود → يرمي `PrismaClientKnownRequestError`
  - الـ Error دا بيرجع 500 Internal Server Error (مش واضح)
  - لما نعمل `findOne()` الأول → بنرمي 404 (واضح ومفيد)
- **ليه `PATCH` وليه مش `PUT`؟**
  - `PUT`: لازم تبعت **كل** الحقول — بيستبدل الـ Resource كله
  - `PATCH`: تبعت الحقول اللي عايز تغيرها بس — **Partial Update**
  - `PartialType` في الـ DTO بيخلي كل الحقول Optional → مناسب لـ PATCH

**`remove()`:**
```typescript
async remove(id: number): Promise<Employee> {
  await this.findOne(id);  // ← تأكد إنه موجود
  return this.prisma.employee.delete({ where: { id } });
}
```
- `.delete()` → DELETE FROM employees WHERE id = ?
- بيرجع الـ Employee المحذوف (مفيد لو عايز تعرضه في الـ Response)
- **تحسين مستقبلي:** Soft Delete → بدل ما تمسح، تضيف `deletedAt: DateTime?`

---

### 6.5 `src/employees/employees.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Employee } from '../../generated/prisma/client';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  create(@Body() createEmployeeDto: CreateEmployeeDto): Promise<Employee> {
    return this.employeesService.create(createEmployeeDto);
  }

  @Get()
  findAll(): Promise<Employee[]> {
    return this.employeesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Employee> {
    return this.employeesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ): Promise<Employee> {
    return this.employeesService.update(id, updateEmployeeDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<Employee> {
    return this.employeesService.remove(id);
  }
}
```

#### الـ Route Mapping:

```
@Controller('employees')  →  base path = /employees
+ app.setGlobalPrefix('api')  →  /api/employees

@Post()           → POST   /api/employees
@Get()            → GET    /api/employees
@Get(':id')       → GET    /api/employees/5
@Patch(':id')     → PATCH  /api/employees/5
@Delete(':id')    → DELETE /api/employees/5
```

#### الـ Decorators بالتفصيل:

```typescript
@Controller('employees')
// ← بيسجل class دا كـ HTTP Controller
// ← 'employees' = الـ route prefix

@Post()
// ← HTTP POST method
// ← مفيش sub-route → /api/employees

@Body() createEmployeeDto: CreateEmployeeDto
// ← بياخد الـ Request Body
// ← ValidationPipe بيتحقق منه تلقائياً (بسبب الـ Global Pipe في main.ts)

@Param('id', ParseIntPipe) id: number
// ← بياخد الـ :id من الـ URL
// ← ParseIntPipe بيحوله من string لـ number
// ← لو مش number → 400 Bad Request
```

---

### 6.6 `src/employees/employees.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';

@Module({
  controllers: [EmployeesController],
  providers: [EmployeesService],
})
export class EmployeesModule {}
```

#### ليه مش بنستورد PrismaModule هنا؟

```typescript
// لأن PrismaModule معمول عليها @Global()
// مش محتاجين نكتب:
@Module({
  imports: [PrismaModule],  // ← مش لازم!
  controllers: [EmployeesController],
  providers: [EmployeesService],
})
```

#### شرح الـ Module Properties:

| Property | الوظيفة | المحتوى |
|----------|---------|---------|
| `imports` | Modules اللي بيعتمد عليها | (فاضي — PrismaModule global) |
| `controllers` | الـ Controllers في الـ Module | `EmployeesController` |
| `providers` | الـ Services والـ Repositories | `EmployeesService` |
| `exports` | اللي بيشاركه مع Modules تانية | (فاضي — محدش محتاج الـ Service من بره) |

---

### 6.7 `src/app.module.ts` — التعديل

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { EmployeesModule } from './employees/employees.module';  // ← إضافة

@Module({
  imports: [
    PrismaModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EmployeesModule,  // ← إضافة
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

**التغيير الوحيد:** إضافة `EmployeesModule` في الـ `imports` array.

**ليه لازم نضيفه في AppModule؟**
- NestJS بيبني **Module Tree** — كل Module لازم يكون مرتبط بالـ Root
- لو ما أضفناش `EmployeesModule` → الـ Controller والـ Service مش هيتسجلوا → الـ Routes مش هتشتغل

---

## 7. خطوات التنفيذ

### 📋 القائمة الكاملة

```
الخطوة 1: إنشاء الـ Module, Controller, Service (NestJS CLI)
الخطوة 2: إنشاء مجلد DTO
الخطوة 3: كتابة الـ DTOs
الخطوة 4: كتابة الـ Service
الخطوة 5: كتابة الـ Controller
الخطوة 6: مراجعة الـ Module
الخطوة 7: مراجعة الـ App Module
الخطوة 8: تشغيل واختبار
```

---

### الخطوة 1: إنشاء الـ Module, Controller, Service

```powershell
# 1.1 إنشاء الـ Module
npx nest g mo employees

# ← الكومند بيعمل:
# ✅ src/employees/employees.module.ts (ملف جديد)
# ✅ يحدّث src/app.module.ts (يضيف EmployeesModule في imports)
```

**شرح الكومند:**
- `npx` → يشغل الـ CLI من `node_modules/.bin/`
- `nest` → NestJS CLI
- `g` → اختصار `generate`
- `mo` → اختصار `module`
- `employees` → اسم الـ Module

```powershell
# 1.2 إنشاء الـ Controller
npx nest g co employees --no-spec --flat

# ← الكومند بيعمل:
# ✅ src/employees/employees.controller.ts (ملف جديد)
# ✅ يحدّث src/employees/employees.module.ts (يضيف EmployeesController في controllers)
```

**شرح الـ Flags:**
- `--no-spec` → ما يعملش ملف Test (هنعمله يدوي بعدين بشكل أفضل)
- `--flat` → ما يعملش مجلد فرعي (الملف يكون جوا `employees/` مباشرة)

```powershell
# 1.3 إنشاء الـ Service
npx nest g s employees --no-spec --flat

# ← الكومند بيعمل:
# ✅ src/employees/employees.service.ts (ملف جديد)
# ✅ يحدّث src/employees/employees.module.ts (يضيف EmployeesService في providers)
```

> **ملاحظة مهمة:** الـ NestJS CLI بيحدّث الـ Module تلقائياً! مش محتاج تضيف يدوي.

---

### الخطوة 2: إنشاء مجلد DTO

```powershell
# في PowerShell
New-Item -ItemType Directory -Path src/employees/dto -Force
```

> **ملاحظة:** مش محتاجين مجلد `entities/` لأن بنستخدم Prisma Generated Types مباشرة كـ Response types.

**ليه مفيش `nest g` command للـ DTOs؟**
- NestJS CLI ما عندوش generator للـ DTOs
- لأنهم Plain Classes — مش محتاجين Dependency Injection أو Module registration
- بنعملهم يدوي

---

### الخطوة 3: كتابة الـ DTOs

**ملف:** `src/employees/dto/create-employee.dto.ts`

```typescript
import { IsString, IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { Role } from '../../generated/prisma/client';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;
}
```

**ملف:** `src/employees/dto/update-employee.dto.ts`

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateEmployeeDto } from './create-employee.dto';

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {}
```

---

### الخطوة 4: كتابة الـ Service

**ملف:** `src/employees/employees.service.ts` — استبدال المحتوى الموجود:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Employee } from '../../generated/prisma/client';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createEmployeeDto: CreateEmployeeDto): Promise<Employee> {
    return this.prisma.employee.create({ data: createEmployeeDto });
  }

  async findAll(): Promise<Employee[]> {
    return this.prisma.employee.findMany();
  }

  async findOne(id: number): Promise<Employee> {
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) throw new NotFoundException(`Employee #${id} not found`);
    return employee;
  }

  async update(id: number, updateEmployeeDto: UpdateEmployeeDto): Promise<Employee> {
    await this.findOne(id);
    return this.prisma.employee.update({
      where: { id },
      data: updateEmployeeDto,
    });
  }

  async remove(id: number): Promise<Employee> {
    await this.findOne(id);
    return this.prisma.employee.delete({ where: { id } });
  }
}
```

---

### الخطوة 5: كتابة الـ Controller

**ملف:** `src/employees/employees.controller.ts` — استبدال المحتوى الموجود:

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Employee } from '../../generated/prisma/client';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  create(@Body() createEmployeeDto: CreateEmployeeDto): Promise<Employee> {
    return this.employeesService.create(createEmployeeDto);
  }

  @Get()
  findAll(): Promise<Employee[]> {
    return this.employeesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Employee> {
    return this.employeesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ): Promise<Employee> {
    return this.employeesService.update(id, updateEmployeeDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<Employee> {
    return this.employeesService.remove(id);
  }
}
```

---

### الخطوة 6: مراجعة الـ Module

الـ NestJS CLI كان لازم يعدل الملف تلقائياً. تأكد إن `employees.module.ts` شكله كدا:

```typescript
import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';

@Module({
  controllers: [EmployeesController],
  providers: [EmployeesService],
})
export class EmployeesModule {}
```

---

### الخطوة 7: مراجعة الـ App Module

تأكد إن `app.module.ts` فيه `EmployeesModule`:

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { EmployeesModule } from './employees/employees.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EmployeesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

---

### الخطوة 8: تشغيل واختبار

```powershell
# 9.1 تشغيل المشروع
npm run start:dev

# 9.2 اختبار الـ Endpoints (في Terminal تاني أو Postman)

# إنشاء موظف جديد
curl -X POST http://localhost:3000/api/employees ^
  -H "Content-Type: application/json" ^
  -d "{\"name\": \"Waleed\", \"email\": \"waleed@example.com\", \"role\": \"ENGINEER\"}"

# عرض كل الموظفين
curl http://localhost:3000/api/employees

# عرض موظف واحد
curl http://localhost:3000/api/employees/1

# تحديث موظف
curl -X PATCH http://localhost:3000/api/employees/1 ^
  -H "Content-Type: application/json" ^
  -d "{\"role\": \"ADMIN\"}"

# مسح موظف
curl -X DELETE http://localhost:3000/api/employees/1
```

---

## 8. الـ API Endpoints

### 8.1 جدول الـ Endpoints

| Method | Endpoint | الوصف | Request Body | Response | Status Code |
|--------|----------|-------|-------------|----------|-------------|
| `POST` | `/api/employees` | إنشاء موظف | `{ name, email, role }` | Employee object | 201 Created |
| `GET` | `/api/employees` | عرض الكل | — | Employee[] | 200 OK |
| `GET` | `/api/employees/:id` | عرض واحد | — | Employee object | 200 OK |
| `PATCH` | `/api/employees/:id` | تحديث جزئي | `{ name?, email?, role? }` | Employee object | 200 OK |
| `DELETE` | `/api/employees/:id` | مسح | — | Employee object | 200 OK |

### 8.2 أمثلة Request/Response

#### POST — إنشاء موظف

```json
// Request
POST /api/employees
Content-Type: application/json

{
  "name": "أحمد محمد",
  "email": "ahmed@company.com",
  "role": "ENGINEER"
}

// Response (201)
{
  "id": 1,
  "name": "أحمد محمد",
  "email": "ahmed@company.com",
  "role": "ENGINEER",
  "createdAt": "2026-06-25T14:30:00.000Z",
  "updatedAt": "2026-06-25T14:30:00.000Z"
}
```

#### GET — خطأ: ID مش موجود

```json
// Request
GET /api/employees/999

// Response (404)
{
  "statusCode": 404,
  "message": "Employee #999 not found",
  "error": "Not Found"
}
```

#### PATCH — تحديث جزئي

```json
// Request
PATCH /api/employees/1
Content-Type: application/json

{
  "role": "ADMIN"
}

// Response (200)
{
  "id": 1,
  "name": "أحمد محمد",
  "email": "ahmed@company.com",
  "role": "ADMIN",
  "createdAt": "2026-06-25T14:30:00.000Z",
  "updatedAt": "2026-06-25T14:35:00.000Z"
}
```

#### POST — خطأ: Validation

```json
// Request
POST /api/employees
Content-Type: application/json

{
  "name": "",
  "email": "not-an-email",
  "role": "SUPER_ADMIN",
  "isHacker": true
}

// Response (400)
{
  "statusCode": 400,
  "message": [
    "name should not be empty",
    "email must be an email",
    "role must be one of the following values: INTERN, ENGINEER, ADMIN",
    "property isHacker should not exist"
  ],
  "error": "Bad Request"
}
```

---

## 9. Testing

### 9.1 Unit Test للـ Service

**ملف:** `src/employees/employees.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { EmployeesService } from './employees.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('EmployeesService', () => {
  let service: EmployeesService;

  // Mock PrismaService — بنحاكي سلوك قاعدة البيانات
  const mockPrisma = {
    employee: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);

    // Reset mocks قبل كل test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an employee', async () => {
      const dto = { name: 'Test', email: 'test@test.com', role: 'ENGINEER' as any };
      const expected = { id: 1, ...dto, createdAt: new Date(), updatedAt: new Date() };

      mockPrisma.employee.create.mockResolvedValue(expected);

      const result = await service.create(dto);

      expect(result).toEqual(expected);
      expect(mockPrisma.employee.create).toHaveBeenCalledWith({ data: dto });
    });
  });

  describe('findAll', () => {
    it('should return array of employees', async () => {
      const expected = [{ id: 1, name: 'Test' }];
      mockPrisma.employee.findMany.mockResolvedValue(expected);

      const result = await service.findAll();

      expect(result).toEqual(expected);
    });
  });

  describe('findOne', () => {
    it('should return an employee', async () => {
      const expected = { id: 1, name: 'Test' };
      mockPrisma.employee.findUnique.mockResolvedValue(expected);

      const result = await service.findOne(1);

      expect(result).toEqual(expected);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrisma.employee.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete and return the employee', async () => {
      const expected = { id: 1, name: 'Test' };
      mockPrisma.employee.findUnique.mockResolvedValue(expected);
      mockPrisma.employee.delete.mockResolvedValue(expected);

      const result = await service.remove(1);

      expect(result).toEqual(expected);
    });

    it('should throw NotFoundException if employee does not exist', async () => {
      mockPrisma.employee.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
```

#### شرح الـ Testing Concepts:

```
ليه Mock؟
─────────
Unit Test = اختبار وحدة واحدة بمعزل عن الباقي
EmployeesService يعتمد على PrismaService
لو استخدمنا PrismaService الحقيقي → محتاجين Database حقيقي → مش Unit Test

Mock = نسخة مزيفة بتحاكي السلوك المتوقع
mockPrisma.employee.create.mockResolvedValue(expected)
  ↑ لما حد يستدعي create() → ارجعله expected

jest.clearAllMocks()
  ↑ قبل كل test → امسح كل الـ mock data عشان ما تأثرش على tests تانية
```

### 9.2 تشغيل الـ Tests

```powershell
# تشغيل كل الـ Tests
npm test

# تشغيل tests معينة
npx jest employees.service.spec.ts

# تشغيل مع coverage
npm run test:cov
```

---

## 10. أخطاء شائعة وحلولها

### 10.1 Prisma Import Path

```typescript
// ❌ غلط — الـ path الافتراضي
import { Role } from '@prisma/client';

// ✅ صح — لأن عندنا custom output في schema.prisma
import { Role } from '../../generated/prisma/client';
```

**السبب:** في `schema.prisma` عندنا `output = "../generated/prisma"` مش الـ default path.

---

### 10.2 Unique Constraint Violation (Email مكرر)

```json
// لو حاولت تعمل Create بـ email موجود:
{
  "statusCode": 500,
  "message": "Internal server error"
}
```

**الحل (تحسين مستقبلي):** إضافة Exception Filter يمسك Prisma errors:

```typescript
// مثال مبسط — هنعمله كـ Enhancement بعدين
import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();

    if (exception.code === 'P2002') {
      // Unique constraint violation
      response.status(HttpStatus.CONFLICT).json({
        statusCode: 409,
        message: 'A record with this value already exists',
        error: 'Conflict',
      });
    }
  }
}
```

---

### 10.3 Empty Body في PATCH

```json
// PATCH /api/employees/1
// Body: {}

// مش هيرمي Error — هيرجع الـ Employee من غير تغيير
// لأن UpdateEmployeeDto كل حقوله Optional
```

---

## 11. التحسينات المستقبلية

| # | الميزة | الأولوية | طريقة التنفيذ | الفايدة |
|---|--------|---------|--------------|---------|
| 1 | **Pagination** | عالية | `findMany({ skip, take })` + Query params `?page=1&limit=10` | أداء أفضل مع بيانات كتير |
| 2 | **Swagger/OpenAPI** | عالية | `@nestjs/swagger` + `@ApiTags` + `@ApiOperation` | توثيق API تلقائي |
| 3 | **Prisma Exception Filter** | عالية | Custom `ExceptionFilter` يمسك Prisma errors | رسائل خطأ أوضح (409 بدل 500) |
| 4 | **Soft Delete** | متوسطة | إضافة `deletedAt: DateTime?` + Override `findMany` | ما تضيعش البيانات |
| 5 | **Search & Filter** | متوسطة | Query params: `?role=ADMIN&search=ahmed` | سهولة البحث |
| 6 | **Sorting** | متوسطة | `orderBy: { createdAt: 'desc' }` + Query param `?sort=name:asc` | ترتيب النتائج |
| 7 | **Caching** | متوسطة | `@nestjs/cache-manager` على الـ GET endpoints | أداء أفضل |
| 8 | **Rate Limiting** | متوسطة | `@nestjs/throttler` (موجود في package.json) | حماية من الـ Abuse |
| 9 | **Roles Guard** | مستقبلية | `@SetMetadata('roles', ['ADMIN'])` + Custom Guard | Authorization |
| 10 | **Logging** | مستقبلية | `@nestjs/common Logger` أو `winston` | مراقبة وتتبع |
| 11 | **Health Check** | مستقبلية | `@nestjs/terminus` + `/api/health` endpoint | Monitoring |

---

## 📚 مراجع مفيدة

- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [class-validator Decorators](https://github.com/typestack/class-validator)
- [NestJS CRUD Best Practices](https://docs.nestjs.com/recipes/crud-generator)

---

> **ملاحظة:** هذا الملف بيتحدث مع تطور المشروع. كل تحسين جديد بيتوثق هنا.
