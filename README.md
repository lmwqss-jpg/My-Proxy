# ATLAS CLIENT — Minecraft Bedrock

**الإصدار / Version:** 1.8.0
**ملف التثبيت / Install file:** `ATLAS.mcaddon`
**الهدف / Target:** Minecraft Bedrock **26.60 (1.26.60)** أو أحدث
**المنصة الأساسية / Primary platform:** PS5 — **لم يُختبر بعد / not tested**
**منصات إضافية / Also supported:** iPhone وAndroid وWindows وأي منصة Bedrock متوافقة
**PS5:** الكود لا يعتمد على جهاز محدد، لكن استيراد الملف والتحكم والواجهة على PS5 **لم تُختبر**. لا تدّعي هذه النسخة توافقاً مؤكداً مع PS5 أو Bedrock Arab.
**التجارب / Experiments:** لا يحتاج أي تفعيل
**دليل التثبيت:** [`docs/INSTALL.md`](docs/INSTALL.md) · **حل المشاكل:** [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) · **السيرفرات:** [`docs/SERVERS.md`](docs/SERVERS.md) · **التوافق:** [`docs/COMPATIBILITY.md`](docs/COMPATIBILITY.md) · **القيود:** [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md) · **التدقيق:** [`docs/AUDIT.md`](docs/AUDIT.md) · **السجل:** [`docs/CHANGELOG.md`](docs/CHANGELOG.md)
**دليل الاختبار الفعلي / Device test plan:** [`docs/DEVICE_TESTING.md`](docs/DEVICE_TESTING.md)
**حالة الاختبار:** `npm run check` يمر بالكامل لنسخة 1.8.0: typecheck، و**27 اختباراً**، و**292 مسار واجهة**، وبناء 51 ملفاً (95.0 KiB)، وتحقق (6 فحوص)، وأدوات Microsoft الرسمية بلا أخطاء. شُغّلت 1.8.0 فعلياً على **Bedrock Dedicated Server 1.26.60.6**: تحمّلت الحزمة، وبدأت السكربتات والأحداث العشرة، وسُجّل الأمران، ووصل `worldLoad`، وعملت الأسماء الأربعة `/atlas` و`/atlas:atlas` و`/atlas:menu` و`/menu`، ونجحت ثلاث إعادات تحميل دون أخطاء. **لم يُختبر 1.8.0 داخل واجهة لاعب حقيقية أو على iPhone أو PS5 أو Realm أو Mega10.** نجاح الخادم لا يُثبت رسم الواجهة أو اللمس أو العربية على جهاز.

---

## ⚠️ اقرأ هذا أولاً: حدود رسمية

هذه الإضافة مبنية على **Script API الرسمي** لماينكرافت بيدروك. بعض ما طُلب غير متاح للإضافات العادية، لذلك لا تدّعي هذه النسخة أنه متاح:

| الطلب | الواقع في Bedrock | البديل المستخدم فعلياً |
|---|---|---|
| أيقونة صغيرة قابلة للنقر أعلى يمين الشاشة | لا توجد واجهة HUD مخصصة قابلة للنقر للإضافات، ولا يمكن تعديل Ore UI | **أداة ATLAS CLIENT** تُعطى تلقائياً في الحقيبة، + الأمر `/atlas` أو `/atlas:menu` |
| فتح القائمة بزر ESC | لا تستطيع الإضافات قراءة لوحة المفاتيح أو التقاط ESC | نفس الأداة + الأمر `/atlas` أو `/atlas:menu` (يعمل بدون تفعيل الغش) |
| لوحة HUD مخصصة متعددة الأسطر | غير متاحة رسمياً للإضافات | سطر HUD في **شريط الإجراءات** فوق شريط الأدوات، مع تشغيل/إيقاف كل عنصر |
| وضع WASD أو الدروع أعلى يمين الشاشة | لا تسمح الإضافات بتحديد موضع النص؛ شريط الإجراءات هو السطح الوحيد | نفس السطر، لكن العناصر الجديدة تأتي أولاً: WASD ثم CPS ثم المؤشرات ثم الدروع |
| تغيير حجم/شفافية/موضع كل عنصر | غير متاح في Script API | ألوان نصية، وضع مختصر/مفصّل، وتشغيل/إيقاف مستقل |
| أيقونات قطع الدرع داخل HUD | النص فقط متاح؛ لا يمكن رسم أيقونات عناصر في شريط الإجراءات | حروف **H / C / L / B** مع متانة حقيقية ونسبة مئوية |
| قراءة نقرات الفأرة أو أزرار يد PS5 | لا تكشف الإضافة ضغطات الفأرة أو أزرار اليد | WASD من **متجه الحركة الرسمي**، وCPS/LMB/RMB من أحداث اللعبة الفعلية |
| عداد CPS لكل نقرة | لا توجد واجهة لنقرات الهواء | يُحسب فقط ما تسجله اللعبة: هجوم، تفاعل، أو استخدام عنصر |
| تغيير خلفية نوافذ اللعبة أو Ore UI | غير متاح رسمياً | ثيمات للنصوص والألوان وشريط HUD وعلامات المواقع فقط |
| نسخ رمز الإعدادات أو عنوان السيرفر آلياً | لا توفر الإضافات وصولاً إلى الحافظة | يظهر الرمز/العنوان في النموذج ويمكن إرساله إلى الدردشة أو كتابته يدوياً |
| الاتصال بسيرفر من داخل واجهة ATLAS | لا توجد واجهة شبكة أو تغيير سيرفر أو قراءة حالة اتصال في Script API | قسم **SERVER MANAGER** يحفظ العناوين ويعرض خطوات الاتصال الرسمية، بدون زر CONNECT وهمي |
| عرض ONLINE/OFFLINE أو Ping أو عدد لاعبي السيرفر | الإضافة لا تستطيع استعلام سيرفر خارجي | تظهر الحالة **Unknown** مع وقت آخر تحديد يدوي، بدون أرقام وهمية |
| إضافة سيرفر مخصص على PS5 | ماينكرافت على PS5 لا يعرض زر Add Server | الإضافة تحفظ العنوان للرجوع، ولا تدّعي قدرتها على تغيير واجهة PS5 |
| كشف الحاويات عبر الجدران أو قراءة محتواها المخفي (ESPchest) | غير متاح للإضافات، ومحاولته تعني عرض بيانات غير حقيقية | قسم **ESPCHEST** يسجل فقط الحاويات التي تفتحها فعلاً، مع النوع والموقع والمسافة، دون كشف مخفي |

**لا توجد في هذه الإضافة:** X-ray، ESP، رؤية خلف الجدران، Aimbot، Auto Clicker، أو أي أتمتة قتال.
**لا تحتاج** إلى «Beta APIs» أو أي تجربة أخرى.

---

## 1.7.0 — لماذا لم يعمل `/atlas`؟

كان `/atlas` يعطي **Command Not Found** لأن Bedrock **يشترط وجود namespace** في اسم أي أمر مخصص. النسخة 1.6.0 سجّلت `atlas:menu` فقط، فكان الأمر الصحيح `/atlas:menu` وليس `/atlas`.

في 1.7.0:

- سجّلنا `atlas:atlas` أيضاً. ماينكرافت تضيف تلقائياً الاسم المختصر لكل أمر مخصص في الدردشة، فيصبح **`/atlas`** متاحاً (و`/atlas:atlas`).
- بقي `atlas:menu` هو الأمر الأساسي، ويعطيك أيضاً `/atlas:menu` و`/menu`.
- كل اسم يُسجّل منفصلاً: تعارض اسم واحد لا يعطّل الاسم الآخر، ولا يعطّل الأداة.
- **DIAGNOSTICS** يعرض أسماء الأوامر التي قبلها اللعبة فعلاً، و`EXPORT DIAGNOSTICS` يضيف سطر `Entry points:`.

> **مهم:** الأوامر لا توجد إلا عندما تكون ATLAS مثبتة ومفعّلة **في العالم نفسه**. على سيرفر عام لا تشغّله الحزمة، لا يمكن للأمر أن يظهر؛ الإضافة لا تستطيع تسجيل أوامر داخل سيرفر لا يشغّلها. الأداة تعمل فقط في البيئة التي شغّلت السكربت. لا يحتاج `/atlas` أو `/atlas:menu` إلى صلاحيات Operator أو تفعيل الغش.

| البيئة | `/atlas` | `/atlas:menu` | الأداة | الحالة |
|---|---|---|---|---|
| عالم محلي مع تفعيل Behavior Pack | متوقع | متوقع | متوقع | تم التحقق من التسجيل في محاكي API فقط؛ لم يُختبر داخل اللعبة |
| Realm مع تثبيت الحزمة من المالك | متوقع | متوقع | متوقع | **NOT TESTED** |
| سيرفر خاص / BDS يشغّل الحزمة | متوقع | متوقع | متوقع | **NOT TESTED** |
| سيرفر عام لا يشغّل الحزمة | لا | لا | لا | متوقع بالتصميم: لا سكربت = لا إضافة |
| PS5 | غير مختبر | غير مختبر | غير مختبر | **NOT TESTED** |

التفاصيل الكاملة في [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) و[`docs/COMPATIBILITY.md`](docs/COMPATIBILITY.md).

---

## محرك التوافق العالمي

تضيف **ATLAS UNIVERSAL COMPATIBILITY ENGINE** ومدير توافق مستقل لكل ميزة. عند دخول أي عالم أو سيرفر تكون فيه الحزمة مفعّلة:

- يفحص المحرك واجهات Script API الفعلية عند تحميل العالم ودخول اللاعب وإعادة الظهور وتغيير البُعد، ويعيد تهيئة الأنظمة المطلوبة فقط.
- كل قسم يحصل على حالة حقيقية: `WORKING` أو `LIMITED` أو `READY` أو `UNAVAILABLE` أو `ERROR` أو `NOT TESTED`. لا تُعرض `WORKING` إلا بعد نجاح عملية فعلية في الجلسة.
- غياب واجهة اختيارية يعطّل عنصرها فقط، ولا يوقف بقية العميل. لا تُنشأ مستمعات أو أوامر مكررة بعد إعادة التهيئة.
- الإعدادات والمواقع وسجل ESPCHEST تبقى محفوظة بعد إعادة الظهور أو تغيير البُعد أو إعادة الدخول.
- **Settings → Diagnostics** يعرض حالات كل الأقسام، الواجهات المتاحة وغير المتاحة، عدد مرات إعادة التهيئة والأخطاء، مع زر **EXPORT DIAGNOSTICS** يرسل تقريراً قابلاً للنسخ إلى الدردشة. لا يقرأ كلمات مرور أو رموزاً أو بيانات Microsoft.

التفاصيل والمصفوفة الكاملة: [`docs/COMPATIBILITY.md`](docs/COMPATIBILITY.md).
الحدود نفسها تنطبق: لا اتصال شبكي، ولا تغيير سيرفر، ولا تجاوز حماية، ولا ادعاء توافق جهاز لم يُختبر.

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
6. لا تفعّل أي Experiments. لا تحتاج تفعيل الغش من أجل `/atlas` أو `/atlas:menu`.
7. ادخل العالم. ستظهر رسالة تأكيد مرة واحدة لكل إصدار، ورسالة ترحيب، وأداة **ATLAS CLIENT** في الحقيبة.

> إذا لم تظهر الحزم ضمن «My Packs»، أعد استيراد الملف وتأكد أن Minecraft نسخة **26.60 أو أحدث**. إذا كانت لديك نسخة قديمة من ATLAS بنفس UUID، احذف الحزم القديمة أولاً ثم استورد الملف الجديد.

### لماذا قد لا تظهر أي واجهة؟

- **الحزمة غير مفعّلة داخل العالم:** التثبيت وحده لا يشغّل السلوك. يجب تفعيل Behavior Pack من إعدادات العالم.
- **إصدار Minecraft أقدم من 26.60:** ملف `manifest.json` يطلب `min_engine_version` مساوياً لـ `[1, 26, 60]`، لذلك لن تُحمّل الحزمة على إصدار أقدم.
- **إصدار API غير موجود:** الحزم تعتمد على `@minecraft/server 2.11.0` و`@minecraft/server-ui 2.3.0` (إصدارات مستقرة في 26.60).
- **أخطاء تحميل أخرى:** فعّل **Settings → Creator → Content Log GUI**، ثم افتح العالم وابحث عن `[ATLAS] Scripts loaded`. يجب أن ترى أيضاً `Event handlers registered` و`Custom command /atlas:menu registered` و`Custom command /atlas:atlas registered` و`World loaded`. إذا توقف السجل قبلها فالسكربت لم يُحمّل؛ تحقق من إصدار اللعبة وتفعيل Behavior Pack.
- **نسخة قديمة عالقة:** إذا كنت جرّبت 1.0.0 أو 1.1.0 أو 1.2.0 أو 1.3.0 أو 1.4.0 أو 1.5.0 أو 1.6.0، احذف الحزمتين القديمتين من العالم أولاً. النسخة الجديدة 1.8.0 لها نفس UUID لكن رقم إصدار أعلى، لذا يستبدلها Minecraft عند الاستيراد.
- **الأداة مفقودة لكن السكربت يعمل:** استخدم `/atlas` أو `/atlas:menu`، أو من القائمة **Waypoints → Restore ATLAS item**.
- **الأمر غير موجود:** إذا لم يظهر `/atlas` أو `/atlas:menu` في الإكمال التلقائي، فالBehavior Pack غير مفعّل أو السكربت لم يُحمّل؛ راجع Content Log. على سيرفر عام يجب أن يشغّل السيرفر الحزمة بنفسه.

---

## 2. فتح القائمة

بعد دخول العالم، لديك هذه الطرق الرسمية:

1. **أداة ATLAS CLIENT** في الحقيبة: اخترها واستخدمها. على اللمس قد تحتاج إلى الضغط على الشاشة/الاستخدام حسب إعدادات التحكم. إن لم تعمل الأداة، استخدم الأمر.
2. **الأمر المختصر:** افتح الدردشة واكتب:

   ```
   /atlas
   ```

3. **الأمر الأساسي:**

   ```
   /atlas:menu
   ```

   ويمكن أيضاً كتابة `/menu`، وهو الاسم المختصر الذي تضيفه ماينكرافت لأمر `atlas:menu`.

4. **اختياري:** إذا كانت الغش مفعّلة:

   ```
   /scriptevent atlas:menu
   ```

كل الأوامر مسجّلة بمستوى `Any` و`cheatsRequired: false`، لذلك لا تحتاج تفعيل الغش. الأوامر لا تظهر إن لم تكن الحزمة مفعّلة في العالم/السيرفر.

ESC **غير مدعوم** لأن الإضافات لا تستطيع التقاط أزرار لوحة المفاتيح. لا يوجد زر وهمي بديل؛ الأداة والأوامر هي الطرق الفعلية.

---

## 3. الأقسام

القائمة الرئيسية تحتوي: **HOME، ESPCHEST، HUD، VISUAL، PLAYER، MOVEMENT، ARMOR، ITEMS، POTIONS، TOTEMS، COMBAT، WAYPOINTS، SERVER MANAGER، SETTINGS، DIAGNOSTICS، ABOUT**. كل قسم يفتح شاشة مستقلة ويعود إلى القائمة الرئيسية.

### HOME

- ملخص حي: الاسم، الصحة، الإحداثيات، البُعد، والموقع المتتبع.
- معاينة نصية لسطر HUD الحالي.
- اختصار إلى محرر HUD.
- تبديل مؤقت الجلسة.
- زر «تشغيل جميع عناصر HUD» (يغيّر عناصر HUD فقط).

### ESPCHEST

- سجل حقيقي للحاويات التي **تفتحها فعلاً** ضمن المدى العادي.
- يعرض نوع الحاوية، الإحداثيات، البُعد، والمسافة والاتجاه إلى موقعك.
- يمكن حذف سجل واحد أو مسح السجل كله مع تأكيد.
- السجل لكل لاعب، وبحد أقصى **20 حاوية**؛ إعادة فتح الحاوية نفسها تحدّث سجلها ولا تكرره.
- لا يقرأ المحتويات، ولا يكتشف حاويات مخفية، ولا يرى عبر الجدران. الحاويات غير المحمّلة أو البعيدة لا تظهر.

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

### VISUAL

- تفاصيل اللاعب: المستوى ونمط اللعب.
- تفاصيل العالم: عدد اللاعبين والصعوبة.
- شريط صحة نصي.
- إحصائيات القتال في HUD.
- علامات المواقع على **شريط التحديد الرسمي (Locator Bar)**. العلامات أيقونات فقط؛ الاسم والمسافة يظهران في متتبع HUD.
- كل عناصر Visual تُضاف إلى **سطر شريط الإجراءات نفسه**؛ لا توجد لوحة منفصلة لأن الإضافات لا تستطيع إنشاء HUD مخصص.
- لا يوجد X-ray أو ESP أو رؤية خلف الجدران.

### PLAYER

- الاسم، الصحة الحقيقية، الإحداثيات، البُعد، نمط اللعب، المستوى، ومدة الجلسة.
- القتلات والوفيات ونسبة K/D من الإحصائيات المحفوظة.
- تبديل عناصر الاسم والصحة والإحداثيات وتفاصيل اللاعب وإحصائيات القتال في HUD.
- القيم غير المتاحة تظهر «غير متاح» ولا تُخترع.

### MOVEMENT

- حالة W/A/S/D الحية من متجه الحركة.
- عدد CPS الحقيقي ومؤشرا LMB/RMB من أحداث اللعبة.
- تشغيل/إيقاف كل من WASD وCPS ومؤشرات النقر.
- يوضح الفرق بين الحركة وأحداث اللعب؛ لا يدّعي قراءة ضغطات لوحة المفاتيح أو الفأرة.

### ARMOR

- قطع الدروع الأربع، نوع كل قطعة، المتانة المتبقية/القصوى والنسبة.
- تشغيل/إيقاف واجهة الدروع وكل قطعة على حدة.
- خيار عرض أقصى متانة، وتنبيه المتانة وصوته.
- تغيير حد تنبيه المتانة من الشاشة نفسها.

### ITEMS

- العنصر في اليد الرئيسية واليد الثانية ونوعه ومتانته إن كانت متاحة.
- عدد توتيم الخلود الحقيقي.
- تشغيل/إيقاف عداد التوتيم وخيار أقصى متانة الدروع.
- يوضح أن الفحص يقتصر على الحقيبة الرئيسية واليد الثانية، ولا يشمل صناديق الشالكير أو الحاويات.

### POTIONS

- التأثيرات النشطة، الاسم، المستوى، والوقت المتبقي.
- التأثيرات اللانهائية تظهر `∞`، وتختفي المنتهية تلقائياً.
- تشغيل/إيقاف واجهة الجرعات.

### TOTEMS

- عدد توتيم الخلود في الحقيبة الرئيسية واليد الثانية.
- تشغيل/إيقاف عداد التوتيم.
- إذا تعذر الوصول إلى الحقيبة تظهر «غير متاح» وليس صفراً.

### COMBAT

- صحة القتال في HUD.
- تنبيه انخفاض الصحة مع حد قابل للضبط (2–19)، وصوت، وتحذير على الشاشة. التنبيه يُطلق مرة واحدة عند كل نزول تحت الحد.
- حفظ نقطة الموت تلقائياً كموقع (Death point).
- سجل القتال: القتلات والوفيات ونسبة K/D (محفوظة)، والضرر وسجل آخر الأحداث (للجلسة الحالية).
- إعادة ضبط إحصائيات القتال.
- **لا يوجد** Aimbot أو Auto Clicker أو أتمتة قتال.

### WAYPOINTS

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

### SERVER MANAGER

- دفتر عناوين لكل لاعب (حتى **40 سيرفراً**) مع الاسم والعنوان والمنفذ والوصف والتصنيف والمنطقة.
- إضافة وتعديل وحذف وترتيب وتفضيل السيرفرات، وتحديد سيرفر حالي **يدوياً** مع وقت آخر تحديد.
- تحقق حقيقي من IPv4 أو النطاق والمنفذ من 1 إلى 65535، ورفض `host:port` داخل حقل العنوان، والتكرار، والأسماء الفارغة.
- **Direct Join:** إدخال عنوان ومنفذ فقط، حفظ آخر عنوان، ثم عرض خطوات الاتصال الرسمية.
- **إرسال العنوان إلى الدردشة** لأن الإضافات لا تصل إلى الحافظة. لا يوجد زر «نسخ» وهمي.
- **لا يوجد زر CONNECT** ولا ONLINE/OFFLINE ولا Ping أو عدد لاعبين أو إعادة اتصال تلقائية: Script API لا يوفر اتصالاً شبكياً ولا قراءة لحالة السيرفر. القسم دفتر عناوين مع خطوات يدوية، وليس متصلاً.
- **PS5:** ماينكرافت على PS5 لا يعرض زر Add Server؛ لا تستطيع الإضافة إضافته أو تجاوز قيود المنصة. التفاصيل في [`docs/SERVERS.md`](docs/SERVERS.md).

### SETTINGS

- أربعة ثيمات: **Atlas Blue / Emerald / Violet / Ember**.
- اللغتان: **العربية / English**.
- إدارة عناصر HUD.
- حفظ فوري لكل تغيير، مع زر «حفظ الآن».
- تصدير/استيراد رمز إعدادات قصير، مثل `ATLAS2-...`، يحتوي الثيم واللغة والتبديلات ومعدل التحديث وحدّي التنبيه ولون HUD. الرموز القديمة `ATLAS1-...` ما زالت مقبولة. لا يحتوي المواقع.
- إعادة ضبط كل الإعدادات.
- **DIAGNOSTICS:** حالة كل قسم وميزة (`WORKING` / `LIMITED` / `READY` / `UNAVAILABLE` / `ERROR` / `NOT TESTED`)، الواجهات المتاحة وغير المتاحة، إصدارات API، دعم شريط التحديد، عدد المواقع واللاعبين، مدة الجلسة الحقيقية، عدد مرات إعادة التهيئة والأخطاء، وزر **EXPORT DIAGNOSTICS** لتقرير قابل للنسخ.
- **ABOUT:** ملخص الحدود الرسمية وإصدار الإضافة.

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
| إصدار الإضافة | 1.8.0 |
| Behavior Pack UUID | `45ec3030-7e82-4b27-b1bc-006fc4d14de5` |
| Resource Pack UUID | `6f7b2107-421b-480f-9a07-3acdf805714d` |

> 26.60 هو آخر إصدار مستقر وقت بناء هذه النسخة. التوافق مع إصدارات أحدث لم يُختبر؛ إذا تغيّر الإصدار الرئيسي للـ API مستقبلاً فقد تحتاج الحزمة إلى تحديث.

### PS5 والسيرفرات العامة

- **PS5:** لم يُختبر الاستيراد أو التشغيل أو الإدخال على PS5. لا توجد واجهة لقراءة أزرار يد PS5؛ WASD تعكس متجه الحركة (العصا اليسرى)، ومؤشرا LMB/RMB يعكسان أحداث اللعبة، وليسا أزراراً فيزيائية. ماينكرافت على PS5 **لا يعرض زر Add Server**، لذلك SERVER MANAGER لا يجعل السيرفرات المخصصة قابلة للاتصال هناك. إذا كانت PS5 لا تسمح بفتح ملف محلي، فجرّب الانضمام إلى عالم/Realm تكون فيه الحزمتان مفعّلتان؛ هذا أيضاً غير مُختبر.
- **طبيعة الإضافات:** الإضافات مرتبطة بالعالم، وليست تعديلاً على جهاز اللاعب. لا تستطيع نسخة مفعّلة على iPhone حقن HUD أو أوامر في عالم سيرفر عام لا يملك الحزمة.
- **Mega10 أو أي سيرفر عام:** إذا لم تكن الحزمة مثبتة ومفعّلة في العالم، فلن تعمل أي ميزة، ولن يظهر `/atlas` ولا `/atlas:menu`. وإذا كانت مثبتة، فقد يمنع السيرفر الحزم المخصصة أو الأوامر أو شريط التحديد أو حفظ البيانات. لا يوجد في ATLAS أي أتمتة قتال أو نقر تلقائي. لم يُختبر المشروع على Mega10.
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

الاختبارات الآلية تغطي بنية الحزم والمنطق و**292 مسار واجهة** في محاكي APIs، كما تتحقق من تسجيل الأسماء الأربعة `/atlas` و`/atlas:atlas` و`/atlas:menu` و`/menu` ومن تعارض اسم واحد دون تعطيل الآخر، ومن حفظ الإعدادات والسيرفرات بعد خروج اللاعب وعودته، واستيراد رموز `ATLAS1` القديمة، وإعادة تهيئة المحرك دون تكرار المستمعات بعد `worldLoad` وإعادة الظهور، وحالات التوافق `WORKING`/`LIMITED`/`UNAVAILABLE`/`ERROR`/`NOT TESTED`، وتصدير تقرير التشخيص، وتدهور HUD عند غياب API اختياري، وفشل النموذج دون تسجيل `WORKING`، وعزل لاعب تالف عن بقية اللاعبين. نُفّذت 1.8.0 أيضاً على Bedrock Dedicated Server 1.26.60.6 (تحميل، أوامر، إعادة تحميل، استقرار) لكن هذا **لا يغني عن التجربة داخل واجهة اللعبة**. لم يتم اختبار 1.8.0 على iPhone أو PS5 أو Realm أو Mega10. راجع [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md) و[`docs/COMPATIBILITY.md`](docs/COMPATIBILITY.md) للتقرير الكامل، و[`docs/DEVICE_TESTING.md`](docs/DEVICE_TESTING.md) لقوائم iPhone وPS5 والسيرفرات.

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
docs/COMPATIBILITY.md         محرك التوافق ومصفوفة العوالم والسيرفرات
docs/DEVICE_TESTING.md        قوائم اختبار iPhone وPS5 والسيرفرات
docs/AUDIT.md                 التدقيق التقني وقرارات 1.4.0–1.8.0
docs/INSTALL.md               دليل التثبيت لكل منصة
docs/SERVERS.md               حدود وطريقة عمل SERVER MANAGER والاتصال اليدوي
docs/TROUBLESHOOTING.md       حل مشاكل التحميل وHUD والإعدادات
docs/CHANGELOG.md             سجل الإصدارات
docs/KNOWN_LIMITATIONS.md    القيود غير المدعومة وغير المختبرة
```

المجلد الرئيسي للمشروع هو `ATLAS` داخل `src/`. يحتوي الـ mcaddon على مجلدين في الجذر: `ATLAS_BP/` و`ATLAS_RP/`، وكل منهما يحتوي `manifest.json` مباشرة. لا توجد مجلدات متداخلة ولا ملفات إضافية؛ هذا هو الشكل الذي يقبله مستورد Minecraft، ووضع الحزم داخل مجلد ATLAS إضافي في الـ ZIP قد يمنع الاستيراد.

الحزمة السلوكية تحتوي على السكربتات وتعريف الأداة، وحزمة الموارد تضيف أيقونات الواجهة والأداة. فعّل الحزمتين للحصول على الشكل الكامل؛ لا تحتاج تثبيتاً منفصلاً، فكلتاهما داخل الملف نفسه.

---

## English

### Command entry points (1.7.0)

1.6.0 registered only `atlas:menu`, so `/atlas` returned **Command Not Found**. Bedrock requires a namespace in a custom command name and automatically exposes the un-namespaced alias in chat. 1.7.0 therefore registers both `atlas:menu` (`/atlas:menu`, `/menu`) and `atlas:atlas` (**`/atlas`**, `/atlas:atlas`). Each name is registered independently; a collision disables only that entry point. Cheats and operator permissions are not required. Commands exist only while ATLAS is installed and active in that world: a public server must run the pack itself. **DIAGNOSTICS** and **EXPORT DIAGNOSTICS** now list the names the game actually accepted. The `/atlas` alias is documented Bedrock behavior, verified in the mock harness and by `/atlas` resolution on BDS 1.26.60.6; it has **not yet been typed into a real Minecraft client chat**.

### Official limits

ATLAS CLIENT uses only the official Bedrock Script API. A clickable top-right overlay, ESC capture, Ore UI modification, a multi-line custom HUD, per-element positioning, font size, transparency, armor icons and a vertical armor position are **not available to add-ons**. The working replacements are:

- An **ATLAS CLIENT item** given on spawn.
- The **`/atlas`** and **`/atlas:menu`** custom commands (plus `/menu`), available without cheats.
- An action-bar HUD with independently toggleable elements. New live panels are ordered first: WASD, CPS, LMB/RMB, armor, effects and totems.
- Native Bedrock forms for all menus and settings.
- Optional locator-bar waypoints through the official `LocatorBar` API.
- A HUD editor for panel toggles, per-piece armor visibility, accent colour, durability threshold and reset.

**Input limits:** WASD is driven by the real movement vector (`Player.inputInfo.getMovementVector()`), not physical key events. CPS and LMB/RMB count game-reported attacks, interactions and item uses; clicks into empty air are not exposed by the API. PS5 controller buttons and mouse buttons cannot be read directly, and no fake CPS is generated.

**Server limits:** add-ons cannot open a network connection, read Minecraft's server list, transfer a player, or observe ONLINE/OFFLINE state, ping, version or player count. **SERVER MANAGER** is a validated per-player address book with a manual connection guide. It deliberately has no CONNECT button, no fake status values and no auto-reconnect switch. `@minecraft/server-admin.transferPlayer` is dedicated-server-only and experimental, so it is not used. Add-ons also have no clipboard access; addresses can be sent to chat. PS5 has no Add Server button, and ATLAS cannot add one.

The add-on contains no X-ray, ESP, aimbot, auto-clicker, or combat automation.

**Compatibility engine (introduced in 1.6.0, preserved in 1.8.0):** ATLAS probes the real Script API capabilities on world load and player join/respawn. Every section reports `WORKING`, `LIMITED`, `READY`, `UNAVAILABLE`, `ERROR` or `NOT TESTED`; `WORKING` requires a real successful operation, never a static claim. Reinitialization keeps settings, waypoints and the ESPCHEST log and does not duplicate listeners or commands. **Settings → Diagnostics → EXPORT DIAGNOSTICS** sends a copyable report to chat. Servers can still block packs, commands, storage, locator bar or events; ATLAS reports that as `UNAVAILABLE` instead of pretending support. See [`docs/COMPATIBILITY.md`](docs/COMPATIBILITY.md).

### iPhone installation

1. Download `ATLAS.mcaddon` to Files.
2. Tap it and choose **Share → Minecraft** (or open it with Minecraft).
3. Wait for both packs to import.
4. Create/edit a world → **Add-Ons → Behavior Packs → My Packs → ATLAS CLIENT → Activate**.
5. **Resource Packs → My Packs → ATLAS CLIENT Resources → Activate**.
6. Do not enable experiments. Cheats are not required for `/atlas` or `/atlas:menu`.
7. Enter the world and use the ATLAS item, or type `/atlas` (or `/atlas:menu`, or `/menu`) in chat.

If nothing appears: verify Minecraft 26.60+, verify the behavior pack is active in the world, enable **Settings → Creator → Content Log GUI**, and look for `[ATLAS] Scripts loaded`. If the item is missing, use `/atlas` or `/atlas:menu`, or **Waypoints → Restore ATLAS item**. The optional `/scriptevent atlas:menu` requires cheats.

### Features

- **HUD:** coordinates, health, player name, world day/time, dimension, compass, tracked waypoint; opt-in session timer; WASD movement panel; observed CPS and LMB/RMB indicators; real armor durability with percentages and per-piece toggles; active potion effects with remaining time; totem count; low-durability alert for equipped armor and the held item; compact/detailed modes; 5–40 tick refresh (default 5); per-element ON/OFF. Missing optional APIs remove only their own element instead of showing fake values.
- **HUD editor:** panel, armor-piece, Visual and PvP HUD switches; accent colour for the whole HUD line; durability alert threshold/sound; session toggle; and HUD reset. Unsupported positioning/size/transparency controls are intentionally not shown.
- **HOME / PLAYER / MOVEMENT / ARMOR / ITEMS / POTIONS / TOTEMS:** real status screens. Each shows only values the API returns and includes the toggles for its own HUD elements.
- **ESPCHEST:** a per-player log of containers actually opened, with type, position, distance and direction. It is not a wall scanner and never reads hidden contents.
- **Visual:** player details, world details, text health bar, combat stats, official locator-bar waypoints.
- **Combat:** combat health, low-health alert with threshold/sound/screen warning, automatic death point, persisted kills/deaths/K/D, session damage and recent combat log. No combat automation.
- **Waypoints:** add/list/rename/move/delete waypoints, distances and directions, HUD tracking, death point, restore item. Up to 30 world-shared waypoints.
- **SERVER MANAGER:** up to 40 saved servers per player with IPv4/domain and port validation, description, category, region label, favourites, ordering, one manual current mark and a last-marked timestamp. Direct Join remembers the last address and opens the official manual connection steps. Addresses can be sent to chat because the clipboard is unavailable. It never connects, pings or reports fake server status.
- **Settings:** four themes, English/Arabic, HUD controls, short `ATLAS2-...` settings export/import code (legacy `ATLAS1-...` and older `ATLAS2` codes accepted), reset, diagnostics with real session duration, per-feature compatibility status, API gaps and a copyable **EXPORT DIAGNOSTICS** report, plus official-limits help. Legacy codes restore their original toggles while newer panels keep their defaults; settings are written to player dynamic properties on every change.

### Documentation

- [`docs/INSTALL.md`](docs/INSTALL.md) — iPhone, desktop, BDS, PS5 and update instructions
- [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) — import, startup, HUD, input and persistence problems
- [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md) — unsupported, partially supported and untested items
- [`docs/SERVERS.md`](docs/SERVERS.md) — Server Manager scope, validation, platform connection steps and limits
- [`docs/COMPATIBILITY.md`](docs/COMPATIBILITY.md) — compatibility engine, reinitialization rules, per-feature status and world/server matrix
- [`docs/AUDIT.md`](docs/AUDIT.md) — architecture and the 1.4.0–1.8.0 audits
- [`docs/CHANGELOG.md`](docs/CHANGELOG.md) — version history
- [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md) and [`docs/DEVICE_TESTING.md`](docs/DEVICE_TESTING.md) — automated evidence and device checklists

### Testing

`npm run typecheck`, `npm test` (27 tests and 292 mock UI flows), `npm run build` (51 files, 95.0 KiB), and `npm run validate` (6 checks) pass for 1.8.0, and official Creator Tools validation reports 0 errors, 0 warnings and 0 recommendations. The archive is a single `ATLAS.mcaddon`. The harness covers all four command names, a single-name collision, settings and server-list reload after a leave/rejoin, legacy `ATLAS1` and older `ATLAS2` import, session timing, coalesced inventory refresh, server address/port validation, the compatibility status model, diagnostics export, reinitialization without duplicate listeners, form-failure `ERROR` reporting and graceful degradation when an optional API is unavailable. **1.8.0 was run on Bedrock Dedicated Server 1.26.60.6**: the pack loaded, scripts started, 10 events and both commands registered, `worldLoad` arrived, `/atlas`, `/atlas:atlas`, `/atlas:menu` and `/menu` resolved, three `/reload` cycles stayed clean and a short soak had no add-on errors. That proves the server startup path only; it did not render a player UI. 1.8.0 was **not tested on iPhone, PS5, a Realm or Mega10**. See `docs/TEST_REPORT.md`, `docs/COMPATIBILITY.md` for the exact scope and `docs/DEVICE_TESTING.md` for the iPhone/PS5/server checklists.

### PS5 and public servers

- **PS5:** import, rendering and controller input were not tested. WASD follows the movement vector (left stick on a controller); LMB/RMB are game-action indicators, not physical mouse buttons. PS5 Minecraft has **no Add Server button**, so SERVER MANAGER cannot make a custom server joinable there. If PS5 cannot open a local file, joining a world/Realm that already has the packs active is the only possible path, and it is also unverified.
- **World-bound packs:** Bedrock add-ons belong to the world, not the player's device. A pack activated on an iPhone cannot inject a HUD or commands into a public server world that does not contain it.
- **Mega10 / public servers:** if the world does not have the pack installed and active, no ATLAS feature runs and neither `/atlas` nor `/atlas:menu` exists. If it does, the server may still block custom packs, commands, the locator bar or data storage, and server rules apply. No combat or click automation is included. Mega10 was not tested.

### Attribution

Built for Minecraft Bedrock using the official stable Script API. Minecraft is a trademark of Mojang Studios; this add-on is not affiliated with Mojang or Microsoft.
