# Google Drive Sync — Documentation

## الهدف
تمكين المستخدم من رفع نسخة احتياطية من بيانات Medora على Google Drive تلقائياً أو يدوياً، واسترجاعها عند الحاجة.

---

## ما تم إنجازه ✅

### 1. Google Cloud Console Setup
- تم إنشاء Project باسم `Medora`
- تم تفعيل **Google Drive API**
- تم إعداد **OAuth Consent Screen** (External) مع scope: `drive.file`
- تم إنشاء **Web Client ID**:
  ```
  271141142279-dk83g4mua8sgbg0ves8b6fjg048piohn.apps.googleusercontent.com
  ```
- تم إضافة Authorized JavaScript origins:
  ```
  https://localhost
  http://localhost
  ```
- تم إضافة Authorized redirect URIs:
  ```
  https://localhost
  http://localhost
  storagerelay://http/localhost
  ```

### 2. الكود المكتوب
- `src/services/googleDriveService.ts` — كامل ويحتوي على:
  - `loadGoogleScript()` — يحمل GSI script من ملف local
  - `signInWithGoogle()` — OAuth flow
  - `signOutGoogle()` — تسجيل الخروج وإلغاء الـ token
  - `getOrCreateFolder()` — ينشئ فولدر "Medora Backups" في Drive
  - `uploadBackupToDrive()` — يرفع ملف `.medora` على Drive
  - `listDriveBackups()` — يجيب قائمة الـ backups من Drive
  - `downloadBackupFromDrive()` — يحمل backup من Drive للاستعادة
  - `rotateGdriveBackups()` — يحذف القديم ويحافظ على آخر N نسخ
- `src/components/GoogleAccountSheet.tsx` — UI للتوصيل/الفصل
- `src/components/GDriveBackupSheet.tsx` — UI للرفع والاستعادة من Drive
- `.env` — يحفظ الـ Client ID بأمان (مش على GitHub)
- `.env.example` — template للمطورين الآخرين

### 3. ملف GSI Local
- تم تحميل `https://accounts.google.com/gsi/client` يدوياً
- وحفظه في `public/gsi-client.js`
- ليتم تحميله داخل الـ WebView بدون الحاجة للإنترنت

---

## المشكلة التي واجهناها ❌

### المشكلة الجوهرية
**Google Identity Services (GSI) مصمم للـ Web Browser — وليس لـ WebView في Capacitor.**

### تسلسل الأخطاء

| الخطأ | السبب | ما جربناه |
|-------|-------|-----------|
| `google is not defined` | الـ WebView لم يحمل external script | حملنا الـ script من `index.html` |
| `Failed to load Google script` | الـ WebView يحجب external scripts | حملنا الـ script locally من `public/gsi-client.js` |
| `Error 400: redirect_uri_mismatch` | لم يكن الـ redirect URI مسجلاً | أضفنا `localhost` في Google Cloud Console |
| `Error 403: access_denied` | الـ app في Testing mode | أضفنا إيميل المستخدم كـ Test User |
| **OAuth يفتح ولا يرجع** | الـ WebView يفتح Google في external browser ومش بيرجع callback | جربنا `prompt: ''` و `prompt: 'select_account'` — لم ينجح |

### السبب التقني العميق
الـ `initTokenClient` من GSI يعتمد على:
1. فتح popup window جديدة
2. إرسال `postMessage` للـ parent window بعد login

في الـ **WebView**:
- مفيش concept لـ "popup window" بنفس طريقة الـ browser
- الـ `postMessage` بين الـ WebView والـ popup مش بيشتغل
- النتيجة: الـ OAuth يفتح ويظل معلقاً للأبد

---

## الحل الصح للمستقبل 🔧

### Option 1 — Chrome Custom Tab (الأفضل لـ Android)
```
الفكرة: نستخدم Android's Custom Tab بدل WebView لفتح OAuth
المميزات:
  ✅ Google يقبله رسمياً
  ✅ يرجع callback للـ app عبر deep link
  ✅ أمان أعلى
المتطلبات:
  - إضافة deep link في AndroidManifest.xml
    <intent-filter>
      <action android:name="android.intent.action.VIEW"/>
      <data android:scheme="com.medora.app" android:host="oauth"/>
    </intent-filter>
  - استخدام Capacitor Plugin:
    npm install @capacitor/browser
  - تسجيل الـ redirect URI في Google Cloud:
    com.medora.app://oauth
  - كود الـ flow:
    1. افتح OAuth URL في Custom Tab
    2. استقبل الـ code عبر deep link
    3. استبدل الـ code بـ access token عبر backend أو PKCE
```

### Option 2 — استخدام Firebase Authentication
```
الفكرة: Firebase بيتعامل مع OAuth على Mobile بشكل صح
المميزات:
  ✅ جاهز ومجرب على Android
  ✅ بيدير الـ token refresh تلقائياً
المتطلبات:
  - إنشاء Firebase project
  - npm install firebase
  - تفعيل Google Sign-in في Firebase Auth
  - google-services.json في android/app/
```

### Option 3 — PKCE Flow مع Custom Redirect
```
الفكرة: استخدام OAuth 2.0 PKCE بدون backend
المميزات:
  ✅ آمن بدون backend
  ✅ يعمل مع deep links
المتطلبات:
  - Web Client ID مع custom scheme redirect
  - تسجيل: com.medora.app:/oauth2redirect في Google Console
  - مكتبة: @openid/appauth أو تنفيذ يدوي
```

---

## التوصية النهائية
**استخدام Option 1 (Chrome Custom Tab مع @capacitor/browser)**  
هو الأبسط والأكثر توافقاً مع Capacitor + Android.

---

## ملفات الكود الجاهزة للاستكمال
كل الكود التالي **جاهز ومكتوب** — فقط يحتاج OAuth flow صحيح:

```
src/services/googleDriveService.ts    ← جاهز (استبدل signInWithGoogle فقط)
src/components/GoogleAccountSheet.tsx ← جاهز
src/components/GDriveBackupSheet.tsx  ← جاهز
```

عند تطبيق الحل الصح، فقط يتم تعديل دالة `signInWithGoogle()` في `googleDriveService.ts` لاستخدام Custom Tab بدل GSI popup.

---

## معلومات مرجعية
- **Web Client ID:** في `.env` كـ `VITE_GOOGLE_CLIENT_ID`
- **Package Name:** `com.medora.app`
- **SHA-1 (debug):** `B0:07:0A:64:0D:95:E9:1B:B0:38:3A:5E:38:A0:78:0C:1A:58:71:4E`
- **Drive Scope:** `https://www.googleapis.com/auth/drive.file`
- **Folder Name on Drive:** `Medora Backups`

---

## تصميم الـ UI — Google Drive Sync Section

### عناصر الـ SyncSection في Settings

```
GOOGLE DRIVE SYNC
┌─────────────────────────────────────────────┐
│ ☁️  Sync Enabled          [Toggle ON/OFF]   │
│     Google Drive                            │
├─────────────────────────────────────────────┤
│ 🔄  Sync Frequency                       ›  │
│     Daily                                   │
├─────────────────────────────────────────────┤
│ 🔒  Encrypted Backup      [Toggle ON/OFF]   │
│     AES-256 encryption                      │
├─────────────────────────────────────────────┤
│ 👤  Google Account                       ›  │
│     Not connected / email@gmail.com         │
├─────────────────────────────────────────────┤
│ 🕐  Last Synced                             │
│     Never / 15 Mar 2026 · 06:48  [Sync Now] │
└─────────────────────────────────────────────┘
```

---

### تفاصيل كل عنصر

#### 1. Sync Enabled (Toggle)
- **النوع:** Switch toggle
- **الوظيفة:** تفعيل/تعطيل الـ sync التلقائي
- **القيمة المحفوظة:** `settings['syncEnabled']` = `'true'` / `'false'`
- **لما يكون OFF:** مش بيعمل sync تلقائي حتى لو في account متوصل
- **لما يكون ON:** بيعمل sync حسب الـ Sync Frequency المختارة

#### 2. Sync Frequency (Row → Bottom Sheet)
- **النوع:** Row بـ Chevron — بيفتح `SyncFrequencySheet`
- **الـ Sheet فيها خيارات:**
  - Every hour
  - Every 6 hours
  - Daily ← الافتراضي
  - Weekly
  - Manual only
- **القيمة المحفوظة:** `settings['syncFrequency']` = `'hourly'` / `'6hours'` / `'daily'` / `'weekly'` / `'manual'`
- **الـ Sheet موجودة في:** `src/components/SyncFrequencySheet.tsx`

#### 3. Encrypted Backup (Toggle)
- **النوع:** Switch toggle
- **الوظيفة:** تشفير الـ backup قبل الرفع على Drive
- **القيمة المحفوظة:** `settings['encryptedBackup']` = `'true'` / `'false'`
- **ملاحظة:** التشفير الفعلي (AES-256) **لم يُنفَّذ بعد** — التصميم موجود فقط
- **مطلوب مستقبلاً:** تنفيذ encryption في `backupService.ts` قبل الرفع

#### 4. Google Account (Row → Bottom Sheet)
- **النوع:** Row بـ Chevron — بيفتح `GoogleAccountSheet`
- **الـ Subtitle:**
  - لو مش متوصل: `"Not connected"`
  - لو متوصل: `"Connected"` أو الإيميل
- **الـ Sheet فيها:**
  - لو مش متوصل: زرار **Connect Google Account** → يبدأ OAuth flow
  - لو متوصل: بيعرض الاسم والإيميل + زرار **Disconnect Account**
- **البيانات المحفوظة:**
  - `settings['googleSignedIn']` = `'true'` / `'false'`
  - `settings['googleEmail']` = إيميل المستخدم
  - `settings['googleName']`  = اسم المستخدم
- **الملف:** `src/components/GoogleAccountSheet.tsx` ← جاهز، بس OAuth مش شغال

#### 5. Last Synced (Row + زرار Sync Now)
- **النوع:** Row عادية + زرار أزرق على اليمين
- **الـ Subtitle:** تاريخ ووقت آخر sync أو `"Never"`
- **القيمة المحفوظة:** `settings['lastSynced']`
- **زرار Sync Now:** بيفتح `SyncProgressSheet` اللي بيعرض progress bar وخطوات الـ sync
- **الـ SyncProgressSheet فيها:**
  - Connecting to Google Drive...
  - Checking for changes...
  - Uploading new records...
  - Uploading images...
  - Verifying upload...
  - Complete ✅
- **الملف:** `src/components/SyncProgressSheet.tsx` ← موجود كـ UI فقط (mock)

---

### عناصر الـ StorageSection المرتبطة بـ Drive

#### Drive Backup (Row → GDriveBackupSheet)
- **كان موجود في:** `src/settings/sections/StorageSection.tsx`
- **الـ Sheet فيها:**
  - زرار **Backup to Drive** → يرفع backup على Drive
  - قائمة الـ backups الموجودة على Drive مع تاريخ وحجم كل واحدة
  - زرار **Restore** جنب كل backup لاستعادتها
- **الملف:** `src/components/GDriveBackupSheet.tsx` ← جاهز

---

### الملفات الجاهزة للاستكمال

| الملف | الحالة |
|-------|--------|
| `src/components/SyncFrequencySheet.tsx` | ✅ جاهز ومكتمل |
| `src/components/SyncProgressSheet.tsx` | ✅ UI جاهز (mock data) |
| `src/components/GoogleAccountSheet.tsx` | ✅ UI جاهز — OAuth يحتاج إصلاح |
| `src/components/GDriveBackupSheet.tsx` | ✅ جاهز — يحتاج OAuth يشتغل |
| `src/services/googleDriveService.ts` | ✅ جاهز — `signInWithGoogle()` يحتاج إصلاح |
| `src/settings/sections/SyncSection.tsx` | ⏸️ موقوف مؤقتاً — "Coming Soon" |
