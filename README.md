# טסים למיקונוס 🏝️

PWA לטיול בנות למיקונוס. מובייל-פירסט, עברית + RTL, כחול-לבן.

משתמשות מורשות: מרים, יעל, שירה, נועה, אביגיל.

## הרצה מקומית

```bash
npm install
npm run dev
```

יפתח על `http://localhost:5173`. לבנייה לפרודקשן: `npm run build` (הפלט ב-`dist/`), ותצוגה מקדימה: `npm run preview`.

האפליקציה היא PWA - ב-build, `manifest.webmanifest` + service worker (`vite-plugin-pwa`) מיוצרים אוטומטית, כך שאפשר להתקין אותה על מסך הבית באייפון/אנדרואיד ("הוספה למסך הבית").

## ארכיטקטורה

```
src/
  types/          טיפוסי ה-domain (ItineraryEvent, Expense, TripDocument, ...)
  lib/
    backend/      שכבת הנתונים הגנרית - זה הלב של הארכיטקטורה, ראו למטה
    notifications.ts   עטיפה ל-Notification API (תזכורות)
    geolocation.ts     עטיפה ל-navigator.geolocation
    format.ts          פורמט תאריכים/מטבע/גודל קובץ
  store/          חנויות Zustand - כל אחת עוטפת createCloudStore + לוגיקה ייעודית לפיצ'ר
  components/
    layout/       Header, BottomNav, AppShell
    ui/           רכיבי UI גנריים (Button, Sheet, Card, Field, Avatar, Icons...)
  screens/        7 המסכים הראשיים + מסך הכניסה
```

## שכבת הנתונים (Data Layer) - מוכן לחיבור ל-Firebase / Supabase

כל האפליקציה מדברת אך ורק דרך הממשק הגנרי ב-`src/lib/backend/types.ts`:

```ts
interface CloudAdapter {
  name: "local" | "firebase" | "supabase";
  collection<T>(name: string): CloudCollection<T>; // subscribe/add/update/remove/getAll
  storage: CloudStorage; // upload/remove/download
}
```

יש 3 מימושים לאותו ממשק:

- **`localAdapter.ts`** (ברירת מחדל) - `localStorage` + `IndexedDB` (לתמונות/קבצים) + `BroadcastChannel` לסנכרון בין טאבים באותו מכשיר. עובד מיד בלי שום הרשמה - בול למה שצריך הערב לפני טיסה.
- **`firebaseAdapter.ts`** - מימוש אמיתי עם Firestore (`onSnapshot` לסנכרון בזמן אמת) + Firebase Storage (`uploadBytesResumable` עם התקדמות, `getDownloadURL`).
- **`supabaseAdapter.ts`** - מימוש אמיתי עם טבלת Postgres + Realtime channel + Supabase Storage bucket.

### איך מתחברים לענן אמיתי (סנכרון בין כל הבנות, לא רק בין טאבים)

1. `cp .env.example .env`
2. פתחו פרויקט Firebase (או Supabase) חדש, העתיקו את המפתחות ל-`.env`
3. הגדירו `VITE_BACKEND=firebase` (או `supabase`)
4. `npm run build`

זהו - שום קוד ברכיבים/חנויות לא משתנה. אם המפתחות חסרים, האפליקציה נופלת אוטומטית חזרה ל-`localAdapter` (עם אזהרה בקונסול).

### הוספת חנות חדשה (feature store) חדשה

```ts
export const useMyFeatureStore = createCloudStore<MyType>("myCollectionName");
```

זהו - יש לך `items`, `loading`, `init()`, `add()`, `update()`, `remove()` שכולם מסונכרנים אוטומטית (מקומית או בענן, תלוי ב-adapter הפעיל).

## פיצ'רים

| מסך | נתיב | תיאור |
|---|---|---|
| כניסה | `/` (לפני login) | בחירת שם → פופאפ לו״ז היום מיידי |
| לו״ז | `/` | CRUD אירועים: שעה, מיקום, תמונות, תזכורת push (`Notification API`) |
| הוצאות | `/expenses` | מי שילמה, סה״כ, מאזן אישי, אלגוריתם התחשבנות מינימלי (מי חייבת למי) |
| מסמכים | `/documents` | העלאה/שם/סוג/הורדה - כרטיסים, דרכונים, מלון, ביטוח |
| מיקום | `/location` | שיתוף מיקום + כפתור פאניקה - `navigator.geolocation` + קישור למפות גוגל |
| ציוד | `/checklist` | רשימת ציוד משותפת עם הקצאה לבנות ספציפיות + מעקב אריזה |
| גלריה | `/gallery` | העלאה המונית (concurrency-controlled), גריד, הורדה למכשיר לכל תמונה |
| הצבעות | `/polls` | יצירת סקר, הצבעה, תוצאות בזמן אמת |

## הערות טכניות

- **תזכורות (Reminders)**: כרגע ה-timers רצים בזיכרון בזמן שהטאב/אפליקציה פתוחים (`setTimeout`). זה מתאים לשימוש כ-PWA פתוח. Push אמיתי ברקע (גם כשהאפליקציה סגורה) דורש שרת + Push API - השלב הבא הטבעי אחרי חיבור Firebase (FCM) או Supabase Edge Functions.
- **אבטחה**: זו אפליקציה פרטית לקבוצה סגורה של 5 בנות עם "login" מבוסס בחירת שם בלבד (בלי סיסמה). כשמחברים Firebase/Supabase לפרודקשן אמיתי, מומלץ להוסיף כלל אבטחה (Firestore Security Rules / RLS ב-Supabase) שמגביל גישה, ואפשר גם Firebase Anonymous Auth כדי שכל "כניסה" תהיה גם session אמיתי בצד השרת.
