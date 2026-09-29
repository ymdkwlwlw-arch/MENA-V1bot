module.exports.config = {
  name: "اعدادات",
  version: "5.0.0",
  hasPermssion: 1,
  credits: "KIROS",
  description: "إعدادات حماية المجموعة",
  commandCategory: "الادمن",
  usages: "[1 2 3 4]",
  cooldowns: 2,
  usePrefix: true
};

const axios = require("axios");

const API_CONFIG =
  "https://raw.githubusercontent.com/shaonproject/Shaon/main/api.json";

/*
 * رفع صورة المجموعة والحصول على الرابط المباشر
 * باستخدام نفس API الخاص بأمر رفع
 */
async function uploadImage(imageUrl) {
  if (!imageUrl) {
    throw new Error("لا يوجد رابط للصورة");
  }

  const apis = await axios.get(API_CONFIG, {
    timeout: 15000
  });

  const Shaon = apis.data?.imgur;

  if (!Shaon) {
    throw new Error("لم يتم العثور على API imgur");
  }

  const url = encodeURIComponent(imageUrl);

  const upload = await axios.get(
    `${Shaon}/imgur?link=${url}`,
    {
      timeout: 30000
    }
  );

  const result =
    upload.data?.uploaded?.image;

  if (!result) {
    throw new Error("فشل رفع الصورة");
  }

  return result;
}


/*
 * التأكد أن المستخدم مسؤول في المجموعة
 */
async function isAdmin(api, threadID, userID) {
  try {
    const info =
      await api.getThreadInfo(threadID);

    const admins =
      Array.isArray(info.adminIDs)
        ? info.adminIDs
        : [];

    return admins.some(
      item =>
        String(item.id) ===
        String(userID)
    );

  } catch (_) {
    return false;
  }
}


/*
 * بناء قائمة الإعدادات
 */
function buildMenu(settings) {
  return `╭─ إعدادات الحماية ─╮
│
│ 1. حماية اسم المجموعة  [${settings.antiName ? "مفعل" : "متوقف"}]
│ 2. حماية صورة المجموعة [${settings.antiImage ? "مفعل" : "متوقف"}]
│ 3. حماية الكنية        [${settings.antiNickname ? "مفعل" : "متوقف"}]
│ 4. الإشعارات           [${settings.notifications ? "مفعل" : "متوقف"}]
│
╰──────────────────────╯

↳ أرسل رقم الإعداد المطلوب
مثال:
1
2
3`;
}


/*
 * إنشاء Snapshot
 *
 * الاسم:
 * threadName
 *
 * الصورة:
 * يتم رفعها إلى API وحفظ الرابط الناتج
 *
 * الكنيات:
 * نحفظ حتى الأعضاء الذين ليس لديهم كنية
 */
async function createSnapshot(api, threadInfo, saveImage) {

  const nicknames = {};

  const participants =
    Array.isArray(threadInfo.participantIDs)
      ? threadInfo.participantIDs
      : [];

  const currentNicknames =
    threadInfo.nicknames || {};

  for (const id of participants) {
    nicknames[String(id)] =
      currentNicknames[id] || "";
  }

  let imageSrc =
    threadInfo.imageSrc || "";

  /*
   * إذا حماية الصورة مفعلة
   * نرفع الصورة ونحفظ الرابط الجديد
   */
  if (saveImage && imageSrc) {
    imageSrc =
      await uploadImage(imageSrc);
  }

  return {
    name:
      threadInfo.threadName || "",

    imageSrc,

    nicknames
  };
}


module.exports.run = async function ({
  api,
  event,
  Threads
}) {

  const {
    threadID,
    messageID,
    senderID
  } = event;

  /*
   * الأمر لمسؤولي المجموعة فقط
   */
  const admin =
    await isAdmin(
      api,
      threadID,
      senderID
    );

  if (!admin) {
    return api.sendMessage(
      "هذا الأمر لمسؤولي المجموعة فقط.",
      threadID,
      messageID
    );
  }

  try {

    const threadData =
      await Threads.getData(threadID);

    const data =
      threadData?.data || {};

    const old =
      data.antiSettings || {};

    const settings = {
      antiName:
        old.antiName === true,

      antiImage:
        old.antiImage === true,

      antiNickname:
        old.antiNickname === true,

      notifications:
        old.notifications === true
    };

    const menu =
      buildMenu(settings);

    api.sendMessage(
      menu,
      threadID,
      (err, info) => {

        if (err || !info) {
          console.error(
            "[اعدادات] Menu error:",
            err
          );
          return;
        }

        if (!global.client.handleReply) {
          global.client.handleReply = [];
        }

        global.client.handleReply.push({
          name: "اعدادات",
          messageID: info.messageID,
          author: senderID,
          settings: {
            ...settings
          }
        });

      },
      messageID
    );

  } catch (error) {

    console.error(
      "[اعدادات] Error:",
      error
    );

    return api.sendMessage(
      "حدث خطأ أثناء تحميل الإعدادات.",
      threadID,
      messageID
    );
  }
};


/*
 * استقبال اختيار الأرقام
 */
module.exports.handleReply = async function ({
  api,
  event,
  handleReply
}) {

  const {
    threadID,
    body,
    senderID,
    messageID
  } = event;

  if (
    String(senderID) !==
    String(handleReply.author)
  ) {
    return;
  }

  const choices =
    String(body || "")
      .match(/[1-4]/g);

  if (!choices) {
    return api.sendMessage(
      "أرسل الأرقام من 1 إلى 4 فقط.",
      threadID,
      messageID
    );
  }

  /*
   * منع تكرار نفس الرقم
   */
  const unique =
    [...new Set(choices)];

  const settings = {
    ...handleReply.settings
  };

  for (const num of unique) {

    switch (num) {

      case "1":
        settings.antiName =
          !settings.antiName;
        break;

      case "2":
        settings.antiImage =
          !settings.antiImage;
        break;

      case "3":
        settings.antiNickname =
          !settings.antiNickname;
        break;

      case "4":
        settings.notifications =
          !settings.notifications;
        break;
    }
  }


  /*
   * حذف قائمة الإعدادات فورًا
   */
  try {
    await api.unsendMessage(
      handleReply.messageID
    );
  } catch (_) {}


  /*
   * إزالة الـ handleReply القديم
   */
  if (Array.isArray(global.client.handleReply)) {

    global.client.handleReply =
      global.client.handleReply.filter(
        item =>
          String(item.messageID) !==
          String(handleReply.messageID)
      );
  }


  /*
   * رسالة التأكيد
   */
  const confirmation =
`تم تعديل إعدادات الحماية.

1. حماية الاسم  : ${settings.antiName ? "مفعل" : "متوقف"}
2. حماية الصورة : ${settings.antiImage ? "مفعل" : "متوقف"}
3. حماية الكنية : ${settings.antiNickname ? "مفعل" : "متوقف"}
4. الإشعارات    : ${settings.notifications ? "مفعل" : "متوقف"}

👍 للتأكيد والحفظ`;

  api.sendMessage(
    confirmation,
    threadID,
    (err, info) => {

      if (err || !info) {
        console.error(
          "[اعدادات] Confirmation error:",
          err
        );
        return;
      }

      if (!global.client.handleReaction) {
        global.client.handleReaction = [];
      }

      global.client.handleReaction.push({
        name: "اعدادات",
        messageID: info.messageID,
        author: senderID,
        newSettings: settings
      });

    },
    messageID
  );
};


/*
 * تثبيت الإعدادات عند 👍
 */
module.exports.handleReaction = async function ({
  api,
  event,
  handleReaction,
  Threads
}) {

  const {
    threadID,
    reaction,
    userID
  } = event;

  if (
    String(userID) !==
    String(handleReaction.author)
  ) {
    return;
  }

  if (reaction !== "👍") {
    return;
  }


  /*
   * التأكد مرة أخرى أن الشخص مسؤول
   */
  const admin =
    await isAdmin(
      api,
      threadID,
      userID
    );

  if (!admin) {
    return;
  }


  try {

    const threadInfo =
      await api.getThreadInfo(threadID);

    const botID =
      api.getCurrentUserID();

    const adminIDs =
      Array.isArray(threadInfo.adminIDs)
        ? threadInfo.adminIDs
        : [];

    const botIsAdmin =
      adminIDs.some(
        item =>
          String(item.id) ===
          String(botID)
      );


    const finalSettings = {
      ...handleReaction.newSettings
    };


    /*
     * الصورة والكنية تحتاج البوت أدمن
     */
    let warning = "";

    if (!botIsAdmin) {

      if (finalSettings.antiImage) {

        finalSettings.antiImage =
          false;

        warning +=
          "\nحماية الصورة تحتاج أن يكون البوت أدمن.";
      }

      if (finalSettings.antiNickname) {

        finalSettings.antiNickname =
          false;

        warning +=
          "\nحماية الكنية تحتاج أن يكون البوت أدمن.";
      }
    }


    /*
     * إنشاء Snapshot جديد
     */
    let snapshot;

    try {

      snapshot =
        await createSnapshot(
          api,
          threadInfo,
          finalSettings.antiImage
        );

    } catch (error) {

      console.error(
        "[اعدادات] Snapshot error:",
        error
      );

      /*
       * إذا فشل رفع الصورة
       * لا نفعل حماية الصورة
       */
      if (finalSettings.antiImage) {

        finalSettings.antiImage =
          false;

        warning +=
          "\nتعذر حفظ صورة المجموعة، تم إيقاف حماية الصورة.";
      }

      snapshot =
        await createSnapshot(
          api,
          threadInfo,
          false
        );
    }


    /*
     * حفظ البيانات
     */
    const current =
      await Threads.getData(threadID);

    const data =
      current?.data || {};

    data.antiSettings =
      finalSettings;

    data.snapshot =
      snapshot;

    data.antiProtection = {
      imageRestoring: false,
      lastImageRestore: 0
    };


    await Threads.setData(
      threadID,
      { data }
    );


    /*
     * حذف رسالة التأكيد
     */
    try {
      await api.unsendMessage(
        handleReaction.messageID
      );
    } catch (_) {}


    /*
     * تنظيف handleReaction
     */
    if (
      Array.isArray(
        global.client.handleReaction
      )
    ) {

      global.client.handleReaction =
        global.client.handleReaction.filter(
          item =>
            String(item.messageID) !==
            String(handleReaction.messageID)
        );
    }


    return api.sendMessage(
`تم حفظ إعدادات الحماية.
الاسم: ${finalSettings.antiName ? "مفعل" : "متوقف"}
الصورة: ${finalSettings.antiImage ? "مفعل" : "متوقف"}
الكنية: ${finalSettings.antiNickname ? "مفعل" : "متوقف"}
الإشعارات: ${finalSettings.notifications ? "مفعل" : "متوقف"}${warning}`,
      threadID
    );

  } catch (error) {

    console.error(
      "[اعدادات] Save Error:",
      error
    );

    return api.sendMessage(
      "تعذر حفظ إعدادات الحماية.",
      threadID
    );
  }
};
