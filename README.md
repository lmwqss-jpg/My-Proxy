# ATLAS CLIENT — Minecraft Bedrock

**الإصدار / Version:** 1.3.0
**ملف التثبيت / Install file:** `ATLAS.mcaddon`
**الهدف / Target:** Minecraft Bedrock **26.60 (1.26.60)** أو أحدث
**المنصة الأساسية / Primary platform:** PS5 — **لم يُختبر بعد / not tested**
**منصات إضافية / Also supported:** iPhone وAndroid وWindows وأي منصة Bedrock متوافقة
**PS5:** الكود لا يعتمد على جهاز محدد، لكن استيراد الملف والتحكم والواجهة على PS5 **لم تُختبر**. لا تدّعي هذه النسخة توافقاً مؤكداً مع PS5 أو Bedrock Arab.
**التجارب / Experiments:** لا يحتاج أي تفعيل
**دليل التثبيت:** [`docs/INSTALL.md`](docs/INSTALL.md) · **حل المشاكل:** [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) · **القيود:** [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md) · **التدقيق:** [`docs/AUDIT.md`](docs/AUDIT.md) · **السجل:** [`docs/CHANGELOG.md`](docs/CHANGELOG.md)
**دليل الاختبار الفعلي / Device test plan:** [`docs/DEVICE_TESTING.md`](docs/DEVICE_TESTING.md)
**حالة الاختبار:** `npm run check` يمر بالكامل لنسخة 1.3.0: typecheck، و13 اختباراً، و**85 مسار واجهة**، وبناء وأرشيف وتحقق. **لم يُختبر 1.3.0 داخل Minecraft أو على iPhone أو PS5 أو Mega10.** النسخة 1.2.0 سبق أن حمّلت سكربتاتها وأحداثها التسعة والأمر و`worldLoad` على Bedrock Dedicated Server 1.26.60.6؛ هذا لا يُثبت عمل الواجهة أو الاستيراد على جهاز حقيقي.

---

## ⚠️ اقرأ هذا أولاً: حدود رسمية

هذه الإضافة مبنية على **Script API الرسمي** لماينكرافت بيدروك. بعض ما طُلب غير متاح للإضافات العادية، لذلك لا تدّعي هذه النسخة أنه متاح:

| الطلب | الواقع في Bedrock | البديل المستخدم فعلياً |
|---|---|---|
| أيقونة صغيرة قابلة للنقر أعلى يمين الشاشة | لا توجد واجهة HUD مخصصة قابلة للنقر للإضافات، ولا يمكن تعديل Ore UI | **أداة ATLAS CLIENT** تُعطى تلقائياً في الحقيبة، + الأمر `/atlas:menu` |
| فتح القائمة بزر ESC | لا تستطيع الإضافات قراءة لوحة المفاتيح أو التقاط ESC | نفس الأداة + الأمر `/atlas:menu` (يعمل بدون تفعيل الغش) |
| لوحة HUD مخصصة متعددة الأسطر | غير متاحة رسمياً للإضافات | سطر HUD في **شريط الإجراءات** فوق شريط الأدوات، مع تشغيل/إيقاف كل عنصر |
| وضع WASD أو الدروع أعلى يمين الشاشة | لا تسمح الإضافات بتحديد موضع النص؛ شريط الإجراءات هو السطح الوحيد | نفس السطر، لكن العناصر الجديدة تأتي أولاً: WASD ثم CPS ثم المؤشرات ثم الدروع |
| تغيير حجم/شفافية/موضع كل عنصر | غير متاح في Script API | ألوان نصية، وضع مختصر/مفصّل، وتشغيل/إيقاف مستقل |
| أيقونات قطع الدرع داخل HUD | النص فقط متاح؛ لا يمكن رسم أيقونات عناصر في شريط الإجراءات | حروف **H / C / L / B** مع متانة حقيقية ونسبة مئوية |
| قراءة نقرات الفأرة أو أزرار يد PS5 | لا تكشف الإضافة ضغطات الفأرة أو أزرار اليد | WASD من **متجه الحركة الرسمي**، وCPS/LMB/RMB من أحداث اللعبة الفعلية |
| عداد CPS لكل نقرة | لا توجد واجهة لنقرات الهواء | يُحسب فقط ما تسجله اللعبة: هجوم، تفاعل، أو استخدام عنصر |
| تغيير خلفية نوافذ اللعبة أو Ore UI | غير متاح رسمياً | ثيمات للنصوص والألوان وشريط HUD وعلامات المواقع فقط |
| نسخ رمز الإعدادات آلياً | لا توفر الإضافات وصولاً إلى الحافظة | يظهر الرمز في النموذج ويمكن إرساله إلى الدردشة أو كتابته يدوياً |

**لا توجد في هذه الإضافة:** X-ray، ESP، رؤية خلف الجدران، Aimbot، Auto Clicker، أو أي أتمتة قتال.
**لا تحتاج** إلى «Beta APIs» أو أي تجربة أخرى.

> **تشخيص فشل التشغيل السابق:** بلاغك عن عدم ظهور شيء داخل Minecraft صحيح، ولا يمكن تأكيد رسالة الخطأ الدقيقة بدون Content Log من جهازك. لذلك فحصنا الملف بأدوات Microsoft الرسمية وأصلحنا كل ما يمكن أن يمنع التحميل أو يفسد الحزمة:
> - نقل `metadata` من داخل `header` إلى الجذر، وإضافة `product_type: "addon"`.
> - إضافة `pack_scope: "world"` إلى حزمة الموارد، وهو شرط Cooperative Add-On الرسمي.
> - تصحيح `item_texture.json`: `textures` يجب أن تكون مصفوفة، وليس نصاً.
> - نقل الأيقونات إلى مجلد باسم المشروع (`textures/atlas/common/`) بدلاً من مجلدات عامة (`items`/`ui`).
> - إزالة `ar_SA` من `languages.json` لأن Bedrock لا يدعم العربية كلغة لعبة؛ العربية تبقى داخل واجهة ATLAS عبر مبدّل اللغة.
> - تحديث تعريف الأداة إلى `format_version 1.26.60`.
> - رفع إصدار الحزمة إلى **1.2.0** لتستبدل أي نسخة قديمة مخزنة.
> - جعل تسجيل كل حدث مستقلاً، وحماية واجهة Locator Bar من إسقاط كامل السكربت على إصدار لا يملكها.
> - إضافة رسالة تأكيد في الدردشة مرة واحدة لكل إصدار: `Scripts v1.2.0 are running`، وإضافة سجلات `[ATLAS] Custom command /atlas:menu registered` و`[ATLAS] World loaded` إلى Content Log.
>
> **إذا استمر الفشل:** أرسل سطر Content Log الذي يبدأ بـ `[ATLAS]` أو `[Scripting]`. لا نستطيع تشخيص رسالة لم نرها.

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
7. ادخل العالم. ستظهر رسالة تأكيد مرة واحدة لكل إصدار، ورسالة ترحيب، وأداة **ATLAS CLIENT** في الحقيبة.

> إذا لم تظهر الحزم ضمن «My Packs»، أعد استيراد الملف وتأكد أن Minecraft نسخة **26.60 أو أحدث**. إذا كانت لديك نسخة قديمة من ATLAS بنفس UUID، احذف الحزم القديمة أولاً ثم استورد الملف الجديد.

### لماذا قد لا تظهر أي واجهة؟

- **الحزمة غير مفعّلة داخل العالم:** التثبيت وحده لا يشغّل السلوك. يجب تفعيل Behavior Pack من إعدادات العالم.
- **إصدار Minecraft أقدم من 26.60:** ملف `manifest.json` يطلب `min_engine_version` مساوياً لـ `[1, 26, 60]`، لذلك لن تُحمّل الحزمة على إصدار أقدم.
- **إصدار API غير موجود:** الحزم تعتمد على `@minecraft/server 2.11.0` و`@minecraft/server-ui 2.3.0` (إصدارات مستقرة في 26.60).
- **أخطاء تحميل أخرى:** فعّل **Settings → Creator → Content Log GUI**، ثم افتح العالم وابحث عن `[ATLAS] Scripts loaded`. يجب أن ترى أيضاً `Event handlers registered` و`Custom command /atlas:menu registered` و`World loaded`. إذا توقف السجل قبلها فالسكربت لم يُحمّل؛ تحقق من إصدار اللعبة وتفعيل Behavior Pack.
- **نسخة قديمة عالقة:** إذا كنت جرّبت 1.0.0 أو 1.1.0 أو 1.2.0، احذف الحزمتين القديمتين من العالم أولاً. النسخة الجديدة 1.3.0 لها نفس UUID لكن رقم إصدار أعلى، لذا يستبدلها Minecraft عند الاستيراد.
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
- **واجهة WASD:** تُضاء W/A/S/D من **متجه الحركة الرسمي** `Player.inputInfo.getMovementVector()`، وليس من ضغطات مفاتيح وهمية. على PS5 تمثل العصا اليسرى، وعلى الكيبورد تمثل WASD.
- **عداد CPS:** يعرض عدد أحداث النقر التي تسجلها اللعبة خلال آخر ثانية. لا يستطيع عد النقر في الهواء لأن API لا يوفره.
- **مؤشرا LMB / RMB:** يضيئان عند هجوم فعلي على كائن/كتلة أو تفاعل/استخدام عنصر. ليسا أزرار فأرة فيزيائية.
- **واجهة الدروع:** الخوذة والصدرية والبنطال والحذاء، مع **المتانة المتبقية الحقيقية** ونسبتها المئوية، وتحديث تلقائي، وتمييز أحمر قرب التلف، وتشغيل/إيقاف كل قطعة. تُعرض كحروف H/C/L/B لأن رسم أيقونات العناصر غير متاح.
- **تأثيرات الجرعات:** اسم كل تأثير ومستواه والوقت المتبقي، وتختفي التأثيرات المنتهية تلقائياً. الوقت اللانهائي يظهر `∞`.
- **عداد التوتيم:** مجموع توتيم الخلود في الحقيبة + اليد الثانية، ويُحدَّث عند تغير الحقيبة.
- **تنبيه المتانة:** يراقب الدروع الأربعة والأداة المحمولة (اليد الرئيسية)، ويظهر تحذيراً (وصوتاً اختيارياً) عند النزول تحت النسبة المحددة، مرة واحدة لكل هبوط. أدوات الحقيبة غير المحمولة لا تُفحص.
- **مؤقت الجلسة:** عنصر اختياري (`HUD → Session timer`) يعرض مدة جلوسك الحقيقية منذ الدخول، ويُعاد ضبطه عند الخروج والعودة. ليس إحصائية محفوظة.
- **محرر HUD:** تشغيل/إيقاف كل واجهة وقطعة درع، لون تمييز سطر HUD، حد المتانة، الوضع المختصر/المفصّل، وإعادة ضبط تخطيط HUD. يشمل الآن مؤقت الجلسة وعناصر Visual وPvP أيضاً. كل تغيير يُحفظ فوراً.
- **تدهور آمن:** إذا لم تتوفر قراءة الصحة أو الاتجاه أو الوقت أو نمط اللعب، يختفي العنصر وحده بدلاً من عرض `0/20` أو `null` أو اتجاه وهمي.
- **عداد التوتيم:** يتحدث فوراً عند تغير الحقيبة وليس فقط عند انتهاء فترة التحديث.
- واجهة مختصرة أو مفصلة، ومعدل تحديث من 5 إلى 40 تكة (الافتراضي 5 لتحديث لوحات الإدخال بسرعة).
- تشغيل/إيقاف كل عنصر بشكل مستقل، وأزرار «تشغيل الكل» و«إيقاف الكل».

> HUD يُرسم في **شريط الإجراءات** فوق شريط الأدوات. لا يمكن للإضافات الرسمية وضعه أعلى يمين الشاشة أو تغيير حجم الخط/الشفافية أو تحريك الدروع عمودياً؛ لذلك لا توجد أزرار وهمية لهذه الخيارات. لتقليل طول السطر، أغلق اللوحات غير المستخدمة من **HUD → HUD editor**.

> **حدود CPS:** عداد CPS حقيقي لكنه **جزئي**: يحسب النقرات التي تولّد أحداثاً في اللعبة (هجوم/تفاعل/استخدام). النقر في الهواء أو النقرات التي لا تسجلها اللعبة لا تظهر. لا يوجد أي توليد نقرات أو أتمتة قتال.

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
- تصدير/استيراد رمز إعدادات قصير، مثل `ATLAS2-...`، يحتوي الثيم واللغة والتبديلات ومعدل التحديث وحدّي التنبيه ولون HUD. الرموز القديمة `ATLAS1-...` ما زالت مقبولة. لا يحتوي المواقع.
- إعادة ضبط كل الإعدادات.
- **Diagnostics:** حالة السكربت، إصدارات API، وجود الأداة، دعم شريط التحديد، عدد المواقع واللاعبين، ومدة الجلسة الحقيقية مقابل تكات الخادم.
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

اللغة العربية مدعومة داخل واجهة ATLAS في كل النصوص والأسماء الافتراضية والاتجاهات. Minecraft Bedrock نفسه لا يوفّر العربية كلغة لعبة، لذلك لا يوجد ملف `.lang` عربي للعبة؛ اختَر العربية من **Settings → Language** داخل الإضافة. عرض النص في النماذج يعتمد على محرك واجهة Bedrock نفسه؛ الإضافة لا ترسم واجهة HTML، لذلك لا يحدث تداخل نصوص من طرفنا. إذا كان اتجاه السطر في نسخة اللعبة غير مثالي، فهذا سلوك واجهة اللعبة وليس تعديلاً من الحزمة.

---

## 5. التصدير والاستيراد

- من **Settings → Export settings code** يظهر رمز قصير.
- «Send code to chat» يرسل الرمز إلى الدردشة، ويمكن أيضاً كتابته يدوياً.
- من **Settings → Import settings code** الصق/اكتب الرمز ثم اضغط Apply.
- الحافظة (Clipboard) غير متاحة للإضافات، لذلك لا يوجد زر «نسخ» آلي.
- الرمز لا ينقل المواقع ولا الإحصائيات؛ هي بيانات عالم/لاعب منفصلة.
- **التوافق الخلفي:** رموز `ATLAS1-...` القديمة ما زالت مقبولة. تستعيد الثيم واللغة والحدود والتبديلات العشرين القديمة، بينما تأخذ اللوحات الجديدة القيم الافتراضية. رموز `ATLAS2-...` القديمة (33 تبديلاً) تعمل أيضاً، ويبقى مؤقت الجلسة الجديد مغلقاً. بعد الاستيراد يصبح التصدير `ATLAS2-...`.
- **الحفظ:** كل تغيير يُحفظ فوراً في Dynamic Properties الخاصة باللاعب. للتحقق بعد إغلاق العالم استخدم **Save & Quit** ثم أعد فتح العالم؛ راجع قسم حفظ الإعدادات في دليل الاختبار.

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
| إصدار الإضافة | 1.3.0 |
| Behavior Pack UUID | `45ec3030-7e82-4b27-b1bc-006fc4d14de5` |
| Resource Pack UUID | `6f7b2107-421b-480f-9a07-3acdf805714d` |

> 26.60 هو آخر إصدار مستقر وقت بناء هذه النسخة. التوافق مع إصدارات أحدث لم يُختبر؛ إذا تغيّر الإصدار الرئيسي للـ API مستقبلاً فقد تحتاج الحزمة إلى تحديث.

### PS5 والسيرفرات العامة

- **PS5:** لم يُختبر الاستيراد أو التشغيل أو الإدخال على PS5. لا توجد واجهة لقراءة أزرار يد PS5؛ WASD تعكس متجه الحركة (العصا اليسرى)، ومؤشرا LMB/RMB يعكسان أحداث اللعبة، وليسا أزراراً فيزيائية. إذا كانت PS5 لا تسمح بفتح ملف محلي، فجرّب الانضمام إلى عالم/Realm تكون فيه الحزمتان مفعّلتان؛ هذا أيضاً غير مُختبر.
- **طبيعة الإضافات:** الإضافات مرتبطة بالعالم، وليست تعديلاً على جهاز اللاعب. لا تستطيع نسخة مفعّلة على iPhone حقن HUD أو أوامر في عالم سيرفر عام لا يملك الحزمة.
- **Mega10 أو أي سيرفر عام:** إذا لم تكن الحزمة مثبتة ومفعّلة في العالم، فلن تعمل أي ميزة. وإذا كانت مثبتة، فقد يمنع السيرفر الحزم المخصصة أو `/atlas:menu` أو شريط التحديد أو حفظ البيانات. لا يوجد في ATLAS أي أتمتة قتال أو نقر تلقائي. لم يُختبر المشروع على Mega10.
- **الواجهة النصية** تظهر فقط عندما تعمل الحزمة في العالم؛ الإعدادات محفوظة لكل لاعب/عالم وليست تعديلاً لواجهة السيرفر.

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

الاختبارات الآلية تغطي بنية الحزم والمنطق و**85 مسار واجهة** في محاكي APIs، كما تتحقق من حفظ الإعدادات بعد خروج اللاعب وعودته، واستيراد رموز `ATLAS1` القديمة، وتوافق رموز `ATLAS2` القديمة، وتدهور HUD عند غياب API اختياري. لكنها **لا تغني عن التجربة داخل Minecraft**. لم يتم اختبار 1.3.0 على iPhone أو PS5 أو داخل Minecraft في بيئة البناء الحالية. راجع [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md) للتقرير الآلي، و[`docs/DEVICE_TESTING.md`](docs/DEVICE_TESTING.md) لقوائم iPhone وPS5 والسيرفرات.

### بنية المستودع

```
ATLAS.mcaddon                 ملف التثبيت النهائي (BP + RP)
src/ATLAS/BP/                 Behavior Pack
src/ATLAS/RP/                 Resource Pack
scripts/build.mjs             بناء ملف mcaddon
scripts/validate.mjs          فحص manifests/UUID/المسارات/ZIP
scripts/generate-assets.mjs   توليد الأيقونات (PNG) بشكل ثابت
test/                         اختبارات Node + محاكي Minecraft
docs/TEST_REPORT.md           تقرير الاختبار الآلي والتوافق
docs/DEVICE_TESTING.md        قوائم اختبار iPhone وPS5 والسيرفرات
docs/AUDIT.md                 التدقيق التقني وقرارات 1.3.0
docs/INSTALL.md               دليل التثبيت لكل منصة
docs/TROUBLESHOOTING.md       حل مشاكل التحميل وHUD والإعدادات
docs/CHANGELOG.md             سجل الإصدارات
docs/KNOWN_LIMITATIONS.md    القيود غير المدعومة وغير المختبرة
```

المجلد الرئيسي للمشروع هو `ATLAS` داخل `src/`. يحتوي الـ mcaddon على مجلدين في الجذر: `ATLAS_BP/` و`ATLAS_RP/`، وكل منهما يحتوي `manifest.json` مباشرة. لا توجد مجلدات متداخلة ولا ملفات إضافية؛ هذا هو الشكل الذي يقبله مستورد Minecraft، ووضع الحزم داخل مجلد ATLAS إضافي في الـ ZIP قد يمنع الاستيراد.

الحزمة السلوكية تحتوي على السكربتات وتعريف الأداة، وحزمة الموارد تضيف أيقونات الواجهة والأداة. فعّل الحزمتين للحصول على الشكل الكامل؛ لا تحتاج تثبيتاً منفصلاً، فكلتاهما داخل الملف نفسه.

---

## English

### Official limits

ATLAS CLIENT uses only the official Bedrock Script API. A clickable top-right overlay, ESC capture, Ore UI modification, a multi-line custom HUD, per-element positioning, font size, transparency, armor icons and a vertical armor position are **not available to add-ons**. The working replacements are:

- An **ATLAS CLIENT item** given on spawn.
- The **`/atlas:menu`** custom command, available without cheats.
- An action-bar HUD with independently toggleable elements. New live panels are ordered first: WASD, CPS, LMB/RMB, armor, effects and totems.
- Native Bedrock forms for all menus and settings.
- Optional locator-bar waypoints through the official `LocatorBar` API.
- A HUD editor for panel toggles, per-piece armor visibility, accent colour, durability threshold and reset.

**Input limits:** WASD is driven by the real movement vector (`Player.inputInfo.getMovementVector()`), not physical key events. CPS and LMB/RMB count game-reported attacks, interactions and item uses; clicks into empty air are not exposed by the API. PS5 controller buttons and mouse buttons cannot be read directly, and no fake CPS is generated.

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

- **HUD:** coordinates, health, player name, world day/time, dimension, compass, tracked waypoint; opt-in session timer; WASD movement panel; observed CPS and LMB/RMB indicators; real armor durability with percentages and per-piece toggles; active potion effects with remaining time; totem count; low-durability alert for equipped armor and the held item; compact/detailed modes; 5–40 tick refresh (default 5); per-element ON/OFF. Missing optional APIs remove only their own element instead of showing fake values.
- **HUD editor:** panel, armor-piece, Visual and PvP HUD switches; accent colour for the whole HUD line; durability alert threshold/sound; session toggle; and HUD reset. Unsupported positioning/size/transparency controls are intentionally not shown.
- **Visual:** player details, world details, text health bar, combat stats, official locator-bar waypoints.
- **PvP:** combat health, low-health alert with threshold/sound/screen warning, automatic death point, persisted kills/deaths/K/D, session damage and recent combat log. No combat automation.
- **Utilities:** add/list/rename/move/delete waypoints, distances and directions, HUD tracking, death point, restore item. Up to 30 world-shared waypoints.
- **Settings:** four themes, English/Arabic, HUD controls, short `ATLAS2-...` settings export/import code (legacy `ATLAS1-...` and older `ATLAS2` codes accepted), reset, diagnostics with real session duration, and official-limits help. Legacy codes restore their original toggles while newer panels keep their defaults; settings are written to player dynamic properties on every change.

### Documentation

- [`docs/INSTALL.md`](docs/INSTALL.md) — iPhone, desktop, BDS, PS5 and update instructions
- [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) — import, startup, HUD, input and persistence problems
- [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md) — unsupported, partially supported and untested items
- [`docs/AUDIT.md`](docs/AUDIT.md) — architecture and the 1.3.0 technical audit
- [`docs/CHANGELOG.md`](docs/CHANGELOG.md) — version history
- [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md) and [`docs/DEVICE_TESTING.md`](docs/DEVICE_TESTING.md) — automated evidence and device checklists

### Testing

`npm run typecheck`, `npm test` (13 tests and 85 mock UI flows), `npm run build`, and `npm run validate` pass for 1.3.0. The archive is a single `ATLAS.mcaddon`. The harness also covers settings reload after a leave/rejoin, legacy `ATLAS1` and older `ATLAS2` import, session timing, coalesced inventory refresh and graceful degradation when an optional API is unavailable. **1.3.0 was not tested inside Minecraft, on iPhone, PS5 or Mega10.** The 1.2.0 scripts, nine event registrations, `/atlas:menu` and `worldLoad` were observed on Bedrock Dedicated Server 1.26.60.6 without script errors; that proved startup only and did not render a player UI. See `docs/TEST_REPORT.md` for the exact scope and `docs/DEVICE_TESTING.md` for the iPhone/PS5/server checklists.

### PS5 and public servers

- **PS5:** import, rendering and controller input were not tested. WASD follows the movement vector (left stick on a controller); LMB/RMB are game-action indicators, not physical mouse buttons. If PS5 cannot open a local file, joining a world/Realm that already has the packs active is the only possible path, and it is also unverified.
- **World-bound packs:** Bedrock add-ons belong to the world, not the player's device. A pack activated on an iPhone cannot inject a HUD or commands into a public server world that does not contain it.
- **Mega10 / public servers:** if the world does not have the pack installed and active, no ATLAS feature runs. If it does, the server may still block custom packs, `/atlas:menu`, the locator bar or data storage, and server rules apply. No combat or click automation is included. Mega10 was not tested.

### Attribution

Built for Minecraft Bedrock using the official stable Script API. Minecraft is a trademark of Mojang Studios; this add-on is not affiliated with Mojang or Microsoft.
