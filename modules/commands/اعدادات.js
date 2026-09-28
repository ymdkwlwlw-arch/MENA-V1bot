module.exports.config = {
  name: "اعدادات",
  version: "4.0.0",
  hasPermssion: 1,
  credits: "KIROS",
  description: "إعدادات حماية المجموعة",
  commandCategory: "الادمن",
  usages: "[1 2 3 4]",
  cooldowns: 2,
  usePrefix: true
};

function buildMenu(settings) {
  return `╭─❖ [ Settings ] ❖─╮
│
│ 1. حماية اسم المجموعة  [${settings.antiName ? "✅" : "❌"}]
│ 2. حماية صورة المجموعة [${settings.antiImage ? "✅" : "❌"}]
│ 3. حماية الكنية        [${settings.antiNickname ? "✅" : "❌"}]
│ 4. الإشعارات           [${settings.notifications ? "✅" : "❌"}]
│
╰──────────────────────╯`;
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

  try {
    const threadData = await Threads.getData(threadID);
    const data = threadData?.data || {};

    const settings = {
      antiName: data.antiSettings?.antiName === true,
      antiImage: data.antiSettings?.antiImage === true,
      antiNickname: data.antiSettings?.antiNickname === true,
      notifications: data.antiSettings?.notifications === true
    };

    const menu = buildMenu(settings);

    api.sendMessage(
      menu,
      threadID,
      async (err, info) => {
        if (err || !info) {
          console.error(
            "[اعدادات] Send menu error:",
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
          settings: { ...settings }
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
      "حدث خطأ أثناء تحميل إعدادات الحماية.",
      threadID
    );
  }
};


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

  const choices = String(body || "")
    .match(/\d+/g);

  if (!choices) {
    return api.sendMessage(
      "أرسل أرقام الإعدادات فقط، مثال: 1 3 4",
      threadID,
      null,
      messageID
    );
  }

  const settings = {
    ...handleReply.settings
  };

  for (const num of choices) {
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
   * حذف قائمة الإعدادات الأصلية
   */
  try {
    await api.unsendMessage(
      handleReply.messageID
    );
  } catch (_) {}

  const confirmation =
`╭─❖ [ Settings ] ❖─╮
│
│ 1. حماية اسم المجموعة  [${settings.antiName ? "✅" : "❌"}]
│ 2. حماية صورة المجموعة [${settings.antiImage ? "✅" : "❌"}]
│ 3. حماية الكنية        [${settings.antiNickname ? "✅" : "❌"}]
│ 4. الإشعارات           [${settings.notifications ? "✅" : "❌"}]
│
╰──────────────────────╯

⌲ تفاعل بـ 👍 لتثبيت التغييرات`;

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
        newSettings: settings,
        sourceMessageID: handleReply.messageID
      });
    },
    messageID
  );
};


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

    let warning = "";

    /*
     * حماية الصورة والكنية تحتاج البوت أدمن
     */
    if (!botIsAdmin) {
      if (finalSettings.antiImage) {
        finalSettings.antiImage = false;
        warning +=
          "\nحماية الصورة تحتاج أن يكون البوت أدمن.";
      }

      if (finalSettings.antiNickname) {
        finalSettings.antiNickname = false;
        warning +=
          "\nحماية الكنية تحتاج أن يكون البوت أدمن.";
      }
    }

    const current =
      await Threads.getData(threadID);

    const data =
      current?.data || {};

    data.antiSettings = finalSettings;

    /*
     * حفظ الحالة الحالية كمرجع للحماية
     */
    data.snapshot = {
      name:
        threadInfo.threadName || "",

      imageSrc:
        threadInfo.imageSrc || "",

      nicknames:
        threadInfo.nicknames || {}
    };

    /*
     * حالة الحماية الخاصة بالصور
     */
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

    const status =
`تم حفظ إعدادات الحماية.
الاسم: ${finalSettings.antiName ? "مفعل" : "متوقف"}
الصورة: ${finalSettings.antiImage ? "مفعل" : "متوقف"}
الكنية: ${finalSettings.antiNickname ? "مفعل" : "متوقف"}
الإشعارات: ${finalSettings.notifications ? "مفعل" : "متوقف"}${warning}`;

    return api.sendMessage(
      status,
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
