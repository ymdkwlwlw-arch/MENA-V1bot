module.exports.config = {
  name: "antiEvents",

  eventType: [
    "log:thread-name",
    "log:thread-icon",
    "log:user-nickname"
  ],

  version: "4.0.0",
  credits: "KIROS",
  description: "نظام حماية اسم وصورة وكنية المجموعة"
};

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const API_CONFIG =
  "https://raw.githubusercontent.com/shaonproject/Shaon/main/api.json";


/*
 * رفع الصورة باستخدام نفس API الخاص بأمر رفع
 */
async function uploadImage(imageUrl) {

  if (!imageUrl) {
    throw new Error("لا يوجد رابط للصورة");
  }

  const apis =
    await axios.get(
      API_CONFIG,
      { timeout: 15000 }
    );

  const Shaon =
    apis.data?.imgur;

  if (!Shaon) {
    throw new Error(
      "لم يتم العثور على API imgur"
    );
  }

  const url =
    encodeURIComponent(imageUrl);

  const upload =
    await axios.get(
      `${Shaon}/imgur?link=${url}`,
      { timeout: 30000 }
    );

  const image =
    upload.data?.uploaded?.image;

  if (!image) {
    throw new Error(
      "فشل رفع الصورة"
    );
  }

  return image;
}


/*
 * استعادة الصورة
 */
async function restoreImage(
  api,
  threadID,
  imageUrl
) {

  const cacheDir =
    path.join(
      __dirname,
      "cache"
    );

  await fs.ensureDir(
    cacheDir
  );

  const filePath =
    path.join(
      cacheDir,
      `anti_${threadID}_${Date.now()}.jpg`
    );

  try {

    const response =
      await axios({
        method: "GET",
        url: imageUrl,
        responseType: "stream",
        timeout: 20000,
        maxRedirects: 5,
        headers: {
          "User-Agent":
            "Mozilla/5.0"
        }
      });

    const writer =
      fs.createWriteStream(
        filePath
      );

    response.data.pipe(writer);

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


    if (
      !fs.existsSync(filePath) ||
      fs.statSync(filePath).size <= 0
    ) {
      throw new Error(
        "الصورة فارغة"
      );
    }


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

  } finally {

    try {
      await fs.remove(
        filePath
      );
    } catch (_) {}
  }
}


module.exports.run = async function ({
  event,
  api,
  Threads
}) {

  const {
    threadID,
    logMessageType,
    logMessageData,
    author
  } = event;

  try {

    const thread =
      await Threads.getData(
        threadID
      );

    const data =
      thread?.data || {};

    const settings =
      data.antiSettings;

    const snapshot =
      data.snapshot;


    /*
     * لا توجد حماية
     */
    if (
      !settings ||
      !snapshot
    ) {
      return;
    }


    /*
     * معرفة المسؤول
     */
    let threadInfo;

    try {
      threadInfo =
        await api.getThreadInfo(
          threadID
        );
    } catch (_) {
      threadInfo = {};
    }

    const adminIDs =
      Array.isArray(
        threadInfo.adminIDs
      )
        ? threadInfo.adminIDs
        : [];

    const changedByAdmin =
      adminIDs.some(
        item =>
          String(item.id) ===
          String(author)
      );


    /*
     * تغييرات المسؤول مسموحة
     */
    if (changedByAdmin) {
      return;
    }


    const notify =
      settings.notifications === true;


    /*
     * ==========================
     * حماية اسم المجموعة
     * ==========================
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
        newName !== snapshot.name
      ) {

        api.setTitle(
          snapshot.name,
          threadID,
          err => {

            if (!err && notify) {

              api.sendMessage(
                "م تلعب بالاسم عشان م اركبك 🦧",
                threadID
              );

            }

          }
        );
      }
    }


    /*
     * ==========================
     * حماية صورة المجموعة
     * ==========================
     */

    if (
      logMessageType ===
      "log:thread-icon" &&
      settings.antiImage
    ) {

      if (
        !snapshot.imageSrc
      ) {
        return;
      }


      /*
       * منع Loop
       */
      if (!data.antiProtection) {

        data.antiProtection = {
          imageRestoring: false,
          lastImageRestore: 0
        };

      }


      const protection =
        data.antiProtection;


      if (
        protection.imageRestoring
      ) {
        return;
      }


      const now =
        Date.now();


      if (
        protection.lastImageRestore &&
        now -
        protection.lastImageRestore <
        8000
      ) {
        return;
      }


      protection.imageRestoring =
        true;

      protection.lastImageRestore =
        now;


      await Threads.setData(
        threadID,
        { data }
      );


      try {

        await restoreImage(
          api,
          threadID,
          snapshot.imageSrc
        );


        if (notify) {

          api.sendMessage(
            "ما تناخس الصورة ي عب",
            threadID
          );

        }

      } catch (error) {

        console.error(
          "[ANTI IMAGE]",
          error.message
        );

      } finally {

        protection.imageRestoring =
          false;

        await Threads.setData(
          threadID,
          { data }
        );

      }

    }


    /*
     * ==========================
     * حماية الكنية
     * ==========================
     */

    if (
      logMessageType ===
      "log:user-nickname" &&
      settings.antiNickname
    ) {

      const targetID =
        logMessageData?.participant_id;

      if (!targetID) {
        return;
      }


      /*
       * هل كانت هناك كنية أصلًا؟
       */
      const saved =
        Object.prototype.hasOwnProperty.call(
          snapshot.nicknames || {},
          String(targetID)
        )
          ? snapshot.nicknames[String(targetID)]
          : "";


      /*
       * استعادة الكنية القديمة
       * أو حذف الكنية إذا كانت فارغة
       */
      api.changeNickname(
        saved,
        threadID,
        targetID,
        err => {

          if (err) {
            console.error(
              "[ANTI NICKNAME]",
              err.message || err
            );
            return;
          }

          if (!notify) {
            return;
          }


          /*
           * كانت لديه كنية
           */
          if (saved) {

            api.sendMessage(
              "ما تناخس في الكنية 🦧",
              threadID
            );

          }

          /*
           * لم تكن لديه كنية
           */
          else {

            api.sendMessage(
              "ما تناخس في الكنية 🦧",
              threadID
            );

          }

        }
      );
    }

  } catch (error) {

    console.error(
      "[antiEvents] Error:",
      error
    );

  }
};
