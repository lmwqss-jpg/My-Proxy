# ATLAS CLIENT — Minecraft Bedrock

**الإصدار / Version:** 1.0.0
**ملف التثبيت / Install file:** `ATLAS.mcaddon`
**الهدف / Target:** Minecraft Bedrock **26.60 (1.26.60)** أو أحدث
**المنصة الأساسية / Primary platform:** iPhone — Minecraft Bedrock 26.60+
**التجارب / Experiments:** لا يحتاج أي تفعيل

---

## ⚠️ اقرأ هذا أولاً: حدود رسمية

هذه الإضافة مبنية على **Script API الرسمي** لماينكرافت بيدروك. بعض ما طُلب غير متاح للإضافات العادية، لذلك لا تدّعي هذه النسخة أنه متاح:

| الطلب | الواقع في Bedrock | البديل المستخدم فعلياً |
|---|---|---|
| أيقونة صغيرة قابلة للنقر أعلى يمين الشاشة | لا توجد واجهة HUD مخصصة قابلة للنقر للإضافات، ولا يمكن تعديل Ore UI | **أداة ATLAS CLIENT** تُعطى تلقائياً في الحقيبة، + الأمر `/atlas:menu` |
| فتح القائمة بزر ESC | لا تستطيع الإضافات قراءة لوحة المفاتيح أو التقاط ESC | نفس الأداة + الأمر `/atlas:menu` (يعمل بدون تفعيل الغش) |
| لوحة HUD مخصصة متعددة الأسطر | غير متاحة رسمياً للإضافات | سطر HUD في **شريط الإجراءات** فوق شريط الأدوات، مع تشغيل/إيقاف كل عنصر |
| تغيير خلفية نوافذ اللعبة أو Ore UI | غير متاح رسمياً | ثيمات للنصوص والألوان وشريط HUD وعلامات المواقع فقط |
| نسخ رمز الإعدادات آلياً | لا توفر الإضافات وصولاً إلى الحافظة | يظهر الرمز في النموذج ويمكن إرساله إلى الدردشة أو كتابته يدوياً |

**لا توجد في هذه الإضافة:** X-ray، ESP، رؤية خلف الجدران، Aimbot، Auto Clicker، أو أي أتمتة قتال.
**لا تحتاج** إلى «Beta APIs» أو أي تجربة أخرى.

> ملاحظة عن النسخة السابقة: المستودع لم يكن يحتوي على ملفات النسخة السابقة (كان `README.md` فقط)، لذلك أُعيد بناء الإضافة من الصفر بنفس هوية ATLAS. النسخة الحالية تعالج الأسباب الشائعة لعدم ظهور أي شيء: ملف دخول صحيح، إصدارات API مستقرة، عدم الحاجة لتجارب، أداة قائمة تلقائية، أمر يعمل بدون غش، رسالة ترحيب، وشاشة تشخيص.

---

## 1. التثبيت على iPhone

1. نزّل ملف **`ATLAS.mcaddon`** إلى تطبيق **الملفات (Files)** على الآيفون.
2. اضغط على الملف ثم اختر **مشاركة / Share** ← **Minecraft** (أو اضغط عليه مباشرة إن فتح Minecraft).
3. انتظر حتى تظهر رسالة أن الحزمتين تم استيرادهما. الملف الواحد يحتوي على:
   - **ATLAS CLIENT** (Behavior Pack)
   - **ATLAS CLIENT Resources** (Resource Pack)
4. افتح Minecraft، ثم أنشئ عالماً جديداً أو عدّل عالماً موجوداً.
5. من إعدادات العالم:
   - **Add-Ons / Behavior Packs** ← **My Packs** ← **ATLAS CLIENT** ← **Activate**
   - **Resource Packs** ← **My Packs** ← **ATLAS CLIENT Resources** ← **Activate**
6. لا تفعّل أي Experiments. لا تحتاج تفعيل الغش من أجل `/atlas:menu`.
7. ادخل العالم. ستظهر رسالة ترحيب وأداة **ATLAS CLIENT** في الحقيبة.

> إذا لم تظهر الحزم ضمن «My Packs»، أعد استيراد الملف وتأكد أن Minecraft نسخة **26.60 أو أحدث**. إذا كانت لديك نسخة قديمة من ATLAS بنفس UUID، احذف الحزم القديمة أولاً ثم استورد الملف الجديد.

### لماذا قد لا تظهر أي واجهة؟

- **الحزمة غير مفعّلة داخل العالم:** التثبيت وحده لا يشغّل السلوك. يجب تفعيل Behavior Pack من إعدادات العالم.
- **إصدار Minecraft أقدم من 26.60:** ملف `manifest.json` يطلب `min_engine_version` مساوياً لـ `[1, 26, 60]`، لذلك لن تُحمّل الحزمة على إصدار أقدم.
- **إصدار API غير موجود:** الحزم تعتمد على `@minecraft/server 2.11.0` و`@minecraft/server-ui 2.3.0` (إصدارات مستقرة في 26.60).
- **أخطاء تحميل أخرى:** فعّل **Settings → Creator → Content Log GUI**، ثم افتح العالم وابحث عن `[ATLAS] Scripts loaded`.
- **الأداة مفقودة لكن السكربت يعمل:** استخدم `/atlas:menu`، أو من القائمة **Utilities → Restore ATLAS item**.
- **الأمر غير موجود:** إذا لم يظهر `/atlas:menu` في الإكمال التلقائي، فالBehavior Pack غير مفعّل أو السكربت لم يُحمّل؛ راجع Content Log.

---

## 2. فتح القائمة

بعد دخول العالم، لديك ثلاث طرق رسمية:

1. **أداة ATLAS CLIENT** في الحقيبة: اخترها واستخدمها. على اللمس قد تحتاج إلى الضغط على الشاشة/الاستخدام حسب إعدادات التحكم. إن لم تعمل الأداة، استخدم الطريقة الثانية.
2. **الأمر:** افتح الدردشة واكتب:

   ```
   /atlas:menu
   ```

   الأمر مسجّل بمستوى `Any` و`cheatsRequired: false`، لذلك لا يحتاج تفعيل الغش.
3. **اختياري:** إذا كانت الغش مفعّلة:

   ```
   /scriptevent atlas:menu
   ```

ESC **غير مدعوم** لأن الإضافات لا تستطيع التقاط أزرار لوحة المفاتيح. لا يوجد زر وهمي بديل؛ الأداة والأمر هما الطريقان الفعليان.

---

## 3. الأقسام

### HUD

- الإحداثيات XYZ (مع خيار إحداثيات دقيقة).
- الصحة.
- اسم اللاعب.
- معلومات العالم (اليوم والوقت).
- البُعد الحالي.
- البوصلة والاتجاه.
- متتبع الموقع (الموقع المتتبع والمسافة والاتجاه).
- واجهة مختصرة أو مفصلة، ومعدل تحديث من 5 إلى 40 تكة.
- تشغيل/إيقاف كل عنصر بشكل مستقل، وأزرار «تشغيل الكل» و«إيقاف الكل».

> HUD يُرسم في **شريط الإجراءات** فوق شريط الأدوات. افتراضياً الواجهة **مختصرة** حتى لا يطول السطر على iPhone؛ يمكن جعلها مفصلة من **HUD → HUD options**.

### Visual

- تفاصيل اللاعب: المستوى ونمط اللعب.
- تفاصيل العالم: عدد اللاعبين والصعوبة.
- شريط صحة نصي.
- إحصائيات القتال في HUD.
- علامات المواقع على **شريط التحديد الرسمي (Locator Bar)**. العلامات أيقونات فقط؛ الاسم والمسافة يظهران في متتبع HUD.
- كل عناصر Visual تُضاف إلى **سطر شريط الإجراءات نفسه**؛ لا توجد لوحة منفصلة لأن الإضافات لا تستطيع إنشاء HUD مخصص.
- لا يوجد X-ray أو ESP أو رؤية خلف الجدران.

### PvP

- صحة القتال في HUD.
- تنبيه انخفاض الصحة مع حد قابل للضبط (2–19)، وصوت، وتحذير على الشاشة. التنبيه يُطلق مرة واحدة عند كل نزول تحت الحد.
- حفظ نقطة الموت تلقائياً كموقع (Death point).
- سجل القتال: القتلات والوفيات ونسبة K/D (محفوظة)، والضرر وسجل آخر الأحداث (للجلسة الحالية).
- إعادة ضبط إحصائيات القتال.
- **لا يوجد** Aimbot أو Auto Clicker أو أتمتة قتال.

### Utilities

- إضافة الموقع الحالي كموقع محفوظ.
- عرض قائمة المواقع والمسافة إلى كل موقع.
- إعادة تسمية الموقع.
- نقل الموقع إلى موضعك الحالي.
- حذف الموقع مع تأكيد.
- تتبع موقع في HUD.
- عرض المسافة والاتجاه، والاتجاه النسبي في صفحة التفاصيل.
- حفظ نقطة الموت تلقائياً.
- استعادة أداة ATLAS.
- الحد الأقصى: **30 موقعاً لكل عالم**. المواقع مخزنة في العالم، وتُشارك بين اللاعبين في العالم نفسه.
- المواقع تظهر أيضاً في شريط التحديد الرسمي عند تفعيل Visual → Locator bar waypoints.

### Settings

- أربعة ثيمات: **Atlas Blue / Emerald / Violet / Ember**.
- اللغتان: **العربية / English**.
- إدارة عناصر HUD.
- حفظ فوري لكل تغيير، مع زر «حفظ الآن».
- تصدير/استيراد رمز إعدادات قصير، مثل `ATLAS1-...`، يحتوي الثيم واللغة والتبديلات ومعدل التحديث وحد التنبيه. لا يحتوي المواقع.
- إعادة ضبط كل الإعدادات.
- **Diagnostics:** حالة السكربت، إصدارات API، وجود الأداة، دعم شريط التحديد، عدد المواقع واللاعبين.
- **About:** ملخص الحدود الرسمية.

---

## 4. الثيمات واللغة

| الثيم | اللون الأساسي |
|---|---|
| Atlas Blue | أزرق سماوي |
| Emerald | أخضر زمردي |
| Violet | بنفسجي |
| Ember | برتقالي جمر |

الثيم يغيّر ألوان النصوص في النماذج، وسطر HUD، ولون علامات المواقع في شريط التحديد. **لا يمكنه تغيير خلفية واجهات Minecraft الأصلية أو Ore UI** لأن ذلك خارج صلاحيات الإضافات.

اللغة العربية مدعومة في كل نصوص الإضافة والأسماء الافتراضية والاتجاهات. عرض النص في النماذج يعتمد على محرك واجهة Bedrock نفسه؛ الإضافة لا ترسم واجهة HTML، لذلك لا يحدث تداخل نصوص من طرفنا. إذا كان اتجاه السطر في نسخة اللعبة غير مثالي، فهذا سلوك واجهة اللعبة وليس تعديلاً من الحزمة.

---

## 5. التصدير والاستيراد

- من **Settings → Export settings code** يظهر رمز قصير.
- «Send code to chat» يرسل الرمز إلى الدردشة، ويمكن أيضاً كتابته يدوياً.
- من **Settings → Import settings code** الصق/اكتب الرمز ثم اضغط Apply.
- الحافظة (Clipboard) غير متاحة للإضافات، لذلك لا يوجد زر «نسخ» آلي.
- الرمز لا ينقل المواقع ولا الإحصائيات؛ هي بيانات عالم/لاعب منفصلة.

---

## 6. توافق الإصدارات

| العنصر | القيمة |
|---|---|
| Minecraft Bedrock | 26.60 (1.26.60) أو أحدث |
| `@minecraft/server` | 2.11.0 (stable) |
| `@minecraft/server-ui` | 2.3.0 (stable) |
| `min_engine_version` | `[1, 26, 60]` |
| Experiments | لا شيء |
| Script entry | `scripts/main.js` |
| Behavior Pack UUID | `45ec3030-7e82-4b27-b1bc-006fc4d14de5` |
| Resource Pack UUID | `6f7b2107-421b-480f-9a07-3acdf805714d` |

> 26.60 هو آخر إصدار مستقر وقت بناء هذه النسخة. التوافق مع إصدارات أحدث لم يُختبر؛ إذا تغيّر الإصدار الرئيسي للـ API مستقبلاً فقد تحتاج الحزمة إلى تحديث.

---

## 7. البناء والاختبار

المتطلبات: Node.js 20+.

```bash
npm install
npm run check        # typecheck + tests + build + validate
npm run typecheck    # التحقق من أنواع Script API الرسمية
npm test             # اختبارات الوحدات + محاكي واجهة كامل
npm run build        # ينتج ATLAS.mcaddon
npm run validate     # يفحص الحزم والـ ZIP
```

الاختبارات الآلية تغطي بنية الحزم والمنطق و56 مسار واجهة في محاكي APIs، لكنها **لا تغني عن التجربة داخل Minecraft**. لم يتم اختبار هذه النسخة على iPhone أو داخل Minecraft في بيئة البناء الحالية. راجع [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md) للتقرير الدقيق وقائمة الاختبار اليدوي.

### بنية المستودع

```
ATLAS.mcaddon                 ملف التثبيت النهائي (BP + RP)
src/ATLAS/BP/                 Behavior Pack
src/ATLAS/RP/                 Resource Pack
scripts/build.mjs             بناء ملف mcaddon
scripts/validate.mjs          فحص manifests/UUID/المسارات/ZIP
scripts/generate-assets.mjs   توليد الأيقونات (PNG) بشكل ثابت
test/                         اختبارات Node + محاكي Minecraft
docs/TEST_REPORT.md           تقرير الاختبار والتوافق
```

المجلد الرئيسي للمشروع هو `ATLAS` داخل `src/`. يحتوي الـ mcaddon على مجلدين في الجذر: `ATLAS_BP/` و`ATLAS_RP/`، وكل منهما يحتوي `manifest.json` مباشرة. لا توجد مجلدات متداخلة ولا ملفات إضافية؛ هذا هو الشكل الذي يقبله مستورد Minecraft، ووضع الحزم داخل مجلد ATLAS إضافي في الـ ZIP قد يمنع الاستيراد.

الحزمة السلوكية تحتوي على السكربتات وتعريف الأداة، وحزمة الموارد تضيف أيقونات الواجهة والأداة. فعّل الحزمتين للحصول على الشكل الكامل؛ لا تحتاج تثبيتاً منفصلاً، فكلتاهما داخل الملف نفسه.

---

## English

### Official limits

ATLAS CLIENT uses only the official Bedrock Script API. A clickable top-right overlay, ESC capture, Ore UI modification, and a multi-line custom HUD are **not available to add-ons**. The working replacements are:

- An **ATLAS CLIENT item** given on spawn.
- The **`/atlas:menu`** custom command, available without cheats.
- An action-bar HUD with independently toggleable elements.
- Native Bedrock forms for all menus and settings.
- Optional locator-bar waypoints through the official `LocatorBar` API.

The add-on contains no X-ray, ESP, aimbot, auto-clicker, or combat automation.

### iPhone installation

1. Download `ATLAS.mcaddon` to Files.
2. Tap it and choose **Share → Minecraft** (or open it with Minecraft).
3. Wait for both packs to import.
4. Create/edit a world → **Add-Ons → Behavior Packs → My Packs → ATLAS CLIENT → Activate**.
5. **Resource Packs → My Packs → ATLAS CLIENT Resources → Activate**.
6. Do not enable experiments. Cheats are not required for `/atlas:menu`.
7. Enter the world and use the ATLAS item, or type `/atlas:menu` in chat.

If nothing appears: verify Minecraft 26.60+, verify the behavior pack is active in the world, enable **Settings → Creator → Content Log GUI**, and look for `[ATLAS] Scripts loaded`. If the item is missing, use `/atlas:menu` or **Utilities → Restore ATLAS item**. The optional `/scriptevent atlas:menu` requires cheats.

### Features

- **HUD:** coordinates, health, player name, world day/time, dimension, compass, tracked waypoint; compact/detailed modes; 5–40 tick refresh; per-element ON/OFF.
- **Visual:** player details, world details, text health bar, combat stats, official locator-bar waypoints.
- **PvP:** combat health, low-health alert with threshold/sound/screen warning, automatic death point, persisted kills/deaths/K/D, session damage and recent combat log. No combat automation.
- **Utilities:** add/list/rename/move/delete waypoints, distances and directions, HUD tracking, death point, restore item. Up to 30 world-shared waypoints.
- **Settings:** four themes, English/Arabic, HUD controls, short settings export/import code, reset, diagnostics, official-limits help.

### Testing

`npm run typecheck`, `npm test` (12 tests and 56 mock UI flows), `npm run build`, and `npm run validate` pass. The archive is a single `ATLAS.mcaddon`. **It has not been tested on an iPhone or inside Minecraft in this environment**; see `docs/TEST_REPORT.md` for the exact scope and the manual checklist.

### Attribution

Built for Minecraft Bedrock using the official stable Script API. Minecraft is a trademark of Mojang Studios; this add-on is not affiliated with Mojang or Microsoft.
