# Wedding Contracts API

Node.js + Express + TypeScript backend for the wedding vendor contracts iOS app.

## Setup

### אופציה מהירה — סקריפט אחד (מרים הכול וטוען ל-DB)

```bash
npm run setup
```

הסקריפט עושה: הרצת PostgreSQL (Docker; או ניסיון להפעלה דרך Homebrew אם אין Docker), יצירת `.env`, `npm install`, `npm run build`, והרצת מיגרציות (טעינת הסכמה ומשתמש דמו ל-DB). אחרי ההרצה האפליקציה יכולה לטעון חוזים מהבאקנד.

### התקנה ידנית

1. **PostgreSQL (Docker)**  
   `docker-compose -f docker-compose.dev.yml up -d`

2. **Environment**  
   `cp .env.example .env`

3. **תלויות ובנייה**  
   `npm install && npm run build`

4. **מיגרציה (טעינה ל-DB)**  
   `npm run db:migrate`

5. **הרצת השרת**  
   `npm run dev`

API base: `http://localhost:3000/api`

## Endpoints

- `POST /api/auth/login` — Body: `{ "email", "password" }` → `{ token, user }`
- `GET /api/contracts` — List contracts (Bearer token required)
- `GET /api/contracts/:id` — Get one contract
- `POST /api/contracts` — Create contract (Bearer token required)
- `PATCH /api/contracts/:id/status` — Body: `{ "status" }` (טיוטה | ממתין | נחתם | פעיל | בוטל)

## Full stack with Docker

```bash
npm run build
docker-compose up -d
```

API: http://localhost:3000/api  
PostgreSQL: localhost:5432 (postgres/postgres, db: wedding_contracts)

## כשהדאטאבייס לא זמין

אם PostgreSQL לא רץ, הקריאות ל-API מחזירות **503** עם הודעה: `הדאטאבייס לא זמין. הרץ npm run setup (או הפעל PostgreSQL).` הקונסול יודפס רק שורת לוג קצרה (בלי AggregateError מלא).

## שגיאת ECONNREFUSED על פורט 5432

אם אתה מקבל `ECONNREFUSED ::1:5432` או `127.0.0.1:5432` — PostgreSQL לא רץ.

- **עם Docker:** `docker-compose -f docker-compose.dev.yml up -d` (או `npm run setup`).
- **בלי Docker (Homebrew):**  
  `brew services start postgresql@14` (או הגרסה המותקנת אצלך),  
  צור מסד נתונים: `createdb wedding_contracts`,  
  והרץ מיגרציה: `npm run db:migrate`.  
  אם יש סיסמה/פורט אחר, הגדר ב־`.env`:  
  `DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/wedding_contracts`
