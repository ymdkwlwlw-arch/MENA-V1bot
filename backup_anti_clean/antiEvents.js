module.exports.config = {
  name: "antiEvents",

  eventType: [
    "log:thread-name",
    "log:thread-icon",
    "log:user-nickname",
    "log:thread-call",
    "message"
  ],

  version: "3.0.0",
  credits: "KIROS",
  description: "نظام حماية المجموعة ومكافحة الإزعاج"
};


module.exports.run = async function ({
  event,
  api,
  Threads,
  Users
}) {

  const {
    threadID,
    logMessageType,
    logMessageData,
    author,
    body,
    messageID,
    senderID
  } = event;

  try {

    if (
      logMessageType === "log:thread-name" ||
      logMessageType === "log:user-nickname" ||
      logMessageType === "log:thread-icon"
    ) {
      console.log("[ANTI DEBUG]", JSON.stringify({
        type: logMessageType,
        author,
        senderID,
        data: logMessageData
      }));
    }

    const botID =
      api.getCurrentUserID();

    /*
     * تجاهل أحداث البوت نفسه
     */
    if (
      String(author) === String(botID) ||
      String(senderID) === String(botID)
    ) {
      return;
    }

    /*
     * جلب بيانات المجموعة
     */
    const thread =
      await Threads.getData(threadID);

    if (
      !thread ||
      !thread.data
    ) {
      return;
    }

    const data =
      thread.data;

    /*
     * إذا الحماية غير مفعلة
     */
    if (!data.antiSettings) {
      return;
    }

    const settings =
      data.antiSettings;

    const snapshot =
      data.snapshot || {};

    const sendNotification =
      settings.notifications === true;


    /*
    ══════════════════════════════════
       🛡️ ANTI SPAM
    ══════════════════════════════════
    */

    if (
      settings.antiSpam &&
      event.type === "message" &&
      senderID &&
      String(senderID) !== String(botID)
    ) {

      if (!data.spamTracking) {
        data.spamTracking = {};
      }

      if (!data.spamTracking[senderID]) {

        data.spamTracking[senderID] = {
          count: 0,
          lastReset: Date.now(),
          lastMessage: "",
          duplicateCount: 0,
          warnings: 0
        };
      }

      const now =
        Date.now();

      const userTrack =
        data.spamTracking[senderID];

      /*
       * نافذة 5 ثواني
       */
      if (
        now - userTrack.lastReset >
        5000
      ) {

        userTrack.count = 0;
        userTrack.lastReset = now;
        userTrack.duplicateCount = 0;
      }

      userTrack.count++;

      const currentBody =
        String(body || "").trim();

      /*
       * الرسائل المتكررة
       */
      if (
        currentBody &&
        currentBody ===
        userTrack.lastMessage
      ) {

        userTrack.duplicateCount++;

      } else {

        userTrack.duplicateCount = 0;
      }

      userTrack.lastMessage =
        currentBody;

      /*
       * الحد
       */
      const isSpam =
        userTrack.count > 5 ||
        userTrack.duplicateCount > 3;

      if (isSpam) {

        userTrack.warnings++;

        /*
         * حذف الرسالة المزعجة
         */
        try {
          api.deleteMessage(
            messageID,
            () => {}
          );
        } catch (_) {}

        /*
         * التحذير الأول
         */
        if (
          userTrack.warnings === 1
        ) {

          if (sendNotification) {

            api.sendMessage(
              `⚠️ [ مكافحة الإزعاج ]

توقف عن إرسال الرسائل المتكررة.

تحذير: 1/3`,
              threadID
            );
          }
        }

        /*
         * التحذير الثاني
         */
        else if (
          userTrack.warnings === 2
        ) {

          if (sendNotification) {

            api.sendMessage(
              `⚠️ [ مكافحة الإزعاج ]

تحذير أخير قبل اتخاذ الإجراء.

تحذير: 2/3`,
              threadID
            );
          }
        }

        /*
         * الطرد بعد 3 تحذيرات
         */
        else if (
          userTrack.warnings >= 3
        ) {

          api.removeUserFromGroup(
            senderID,
            threadID,
            err => {

              if (!err) {

                if (sendNotification) {

                  api.sendMessage(
                    `🛡️ [ مكافحة الإزعاج ]

تم اتخاذ إجراء ضد العضو
بسبب الإزعاج المتكرر.`,
                    threadID
                  );
                }

                delete data.spamTracking[
                  senderID
                ];
              }
            }
          );
        }

        await Threads.setData(
          threadID,
          { data }
        );

        return;
      }

      await Threads.setData(
        threadID,
        { data }
      );
    }


    /*
    ══════════════════════════════════
       🖼️ حماية صورة المجموعة
    ══════════════════════════════════
    */

    if (
      logMessageType ===
      "log:thread-icon" &&
      settings.antiImage
    ) {

      /*
       * لا توجد صورة أصلية محفوظة
       */
      if (
        !snapshot.imageSrc
      ) {

        console.log(
          `[ANTI IMAGE] No snapshot for ${threadID}`
        );

        return;
      }

      /*
       * حماية من Loop
       *
       * عندما البوت يرجع الصورة،
       * فيسبوك قد يرسل Event جديد.
       */
      if (!data.antiProtection) {

        data.antiProtection = {
          imageRestoring: false,
          lastImageRestore: 0
        };
      }

      const protection =
        data.antiProtection;

      const now =
        Date.now();

      /*
       * إذا نحن بالفعل في عملية استعادة
       */
      if (
        protection.imageRestoring
      ) {

        console.log(
          `[ANTI IMAGE] Restore already running: ${threadID}`
        );

        return;
      }

      /*
       * تجاهل Event الاستعادة
       * لمدة 8 ثواني
       */
      if (
        protection.lastImageRestore &&
        now -
        protection.lastImageRestore <
        8000
      ) {

        console.log(
          `[ANTI IMAGE] Ignored restore event: ${threadID}`
        );

        return;
      }

      /*
       * منع تشغيل استعادة ثانية
       */
      protection.imageRestoring = true;

      protection.lastImageRestore =
        now;

      await Threads.setData(
        threadID,
        { data }
      );

      let filePath = null;

      try {

        const axios =
          require("axios");

        const fs =
          require("fs-extra");

        const path =
          require("path");

        /*
         * إنشاء cache خاص بالأحداث
         */
        const cacheDir =
          path.join(
            __dirname,
            "cache"
          );

        await fs.ensureDir(
          cacheDir
        );

        filePath =
          path.join(
            cacheDir,
            `anti_image_${threadID}_${Date.now()}.jpg`
          );

        console.log(
          `[ANTI IMAGE] Downloading original image...`
        );

        /*
         * تحميل الصورة الأصلية
         */
        const response =
          await axios({
            method: "GET",
            url: snapshot.imageSrc,
            responseType: "stream",
            timeout: 15000,
            maxRedirects: 5,
            headers: {
              "User-Agent":
                "Mozilla/5.0 KIROS-BOT"
            }
          });

        /*
         * كتابة الصورة
         */
        const writer =
          fs.createWriteStream(
            filePath
          );

        response.data.pipe(
          writer
        );

        await new Promise(
          (resolve, reject) => {

            writer.on(
              "finish",
              resolve
            );

            writer.on(
              "error",
              reject
            );
          }
        );

        /*
         * التأكد من أن الملف فعلاً موجود
         */
        if (
          !fs.existsSync(
            filePath
          )
        ) {

          throw new Error(
            "Image file was not created"
          );
        }

        const stats =
          fs.statSync(
            filePath
          );

        if (
          stats.size <= 0
        ) {

          throw new Error(
            "Downloaded image is empty"
          );
        }

        console.log(
          `[ANTI IMAGE] Restoring image (${stats.size} bytes)...`
        );

        /*
         * استعادة الصورة
         */
        await new Promise(
          (resolve, reject) => {

            api.changeGroupImage(
              fs.createReadStream(
                filePath
              ),
              threadID,
              err => {

                if (err) {
                  return reject(err);
                }

                resolve();
              }
            );
          }
        );

        console.log(
          `[ANTI IMAGE] Image restored successfully: ${threadID}`
        );

        /*
         * إرسال إشعار
         */
        if (
          sendNotification
        ) {

          api.sendMessage(
            `╭─❖ [ حماية الصورة ] ❖─╮
│
│ 🛡️ تم اكتشاف تغيير غير مسموح به.
│
│ 🔄 تمت استعادة الصورة الأصلية.
│
╰──────────────────────╯`,
            threadID
          );
        }

      } catch (error) {

        console.error(
          `[ANTI IMAGE] Restore error (${threadID}):`,
          error.message
        );

        /*
         * فقط إذا كان الإشعارات مفعلاً
         */
        if (
          sendNotification
        ) {

          api.sendMessage(
            `⚠️ [ حماية الصورة ]

تم اكتشاف تغيير في صورة المجموعة،
لكن تعذرت استعادة الصورة تلقائياً.`,
            threadID
          );
        }

      } finally {

        /*
         * حذف الملف المؤقت
         */
        try {

          if (
            filePath
          ) {

            const fs =
              require("fs-extra");

            if (
              fs.existsSync(
                filePath
              )
            ) {

              await fs.remove(
                filePath
              );
            }
          }

        } catch (_) {}

        /*
         * إنهاء حالة الاستعادة
         */
        try {

          const current =
            await Threads.getData(
              threadID
            );

          const currentData =
            current?.data || {};

          if (
            currentData.antiProtection
          ) {

            currentData
              .antiProtection
              .imageRestoring =
              false;

            await Threads.setData(
              threadID,
              {
                data: currentData
              }
            );
          }

        } catch (_) {}
      }
    }


    /*
    ══════════════════════════════════
       🏷️ حماية اسم المجموعة
    ══════════════════════════════════
    */

    if (
      logMessageType ===
      "log:thread-name" &&
      settings.antiName
    ) {

      const newName =
        logMessageData?.name;

      if (
        snapshot.name &&
        newName &&
        newName !== snapshot.name
      ) {

        console.log(
          `[ANTI NAME] Restoring group name: ${threadID}`
        );

        api.setTitle(
          snapshot.name,
          threadID,
          err => {

            if (
              !err &&
              sendNotification
            ) {

              api.sendMessage(
                `🛡️ [ حماية الاسم ]

تم اكتشاف تغيير غير مسموح به.
تمت استعادة اسم المجموعة.`,
                threadID
              );
            }
          }
        );
      }
    }


    /*
    ══════════════════════════════════
       👤 حماية الكنية
    ══════════════════════════════════
    */

    if (
      logMessageType ===
      "log:user-nickname" &&
      settings.antiNickname
    ) {

      const targetID =
        logMessageData?.participant_id;

      if (
        targetID &&
        snapshot.nicknames &&
        Object.prototype.hasOwnProperty.call(
          snapshot.nicknames,
          targetID
        )
      ) {

        const oldNick =
          snapshot.nicknames[targetID] || "";

        console.log(
          `[ANTI NICKNAME] Restoring nickname: ${targetID}`
        );

        api.changeNickname(
          oldNick,
          threadID,
          targetID,
          err => {

            if (
              !err &&
              sendNotification
            ) {

              api.sendMessage(
                `🛡️ [ حماية الكنية ]

تم اكتشاف تغيير غير مسموح به.
تمت استعادة الكنية الأصلية.`,
                threadID
              );
            }
          }
        );
      }
    }


    /*
     * حفظ البيانات
     */
    await Threads.setData(
      threadID,
      { data }
    );

  } catch (error) {

    console.error(
      "[antiEvents] Error:",
      error
    );
  }
};
