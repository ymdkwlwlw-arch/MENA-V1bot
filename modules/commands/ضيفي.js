module.exports.config = {
  name: "ضيفي",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "محمد إدريس",
  description: "إضافة مستخدم إلى المجموعة بواسطة ID أو رابط الملف",
  usePrefix: true,
  commandCategory: "group",
  usages: "ضيفي <ID أو رابط>",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;

  const send = msg =>
    api.sendMessage(msg, threadID, messageID);

  if (!args[0]) {
    return send(
      "استخدم الأمر بهذا الشكل:\n\n" +
      "ضيفي ID\n" +
      "ضيفي رابط الملف\n\n" +
      "مثال:\n" +
      "ضيفي 123456789\n" +
      "ضيفي https://www.facebook.com/username"
    );
  }

  const input = args.join(" ").trim();

  try {
    const threadInfo = await api.getThreadInfo(threadID);

    const participantIDs = Array.isArray(threadInfo.participantIDs)
      ? threadInfo.participantIDs.map(String)
      : [];

    let userID = null;
    let userName = null;

    if (/^\d+$/.test(input)) {
      userID = input;
    } else {
      try {
        const result = await getUID(input, api);

        if (Array.isArray(result)) {
          userID = result[0];
          userName = result[1] || null;
        } else if (result) {
          userID = result;
        }
      } catch (error) {
        console.error("[ضيفي] getUID:", error);
      }

      if (!userID) {
        return send(
          "تعذر الحصول على ID من الرابط.\n" +
          "تأكد أن الرابط صحيح أو استخدم ID مباشرة."
        );
      }
    }

    userID = String(userID);

    if (participantIDs.includes(userID)) {
      return send(
        `${userName || "هذا المستخدم"} موجود بالفعل في المجموعة.`
      );
    }

    try {
      await api.addUserToGroup(
        userID,
        threadID
      );
    } catch (error) {
      console.error("[ضيفي] Add Error:", error);

      return send(
        `تعذر إضافة ${userName || "المستخدم"} إلى المجموعة.\n\n` +
        `ID: ${userID}\n` +
        `السبب: ${error.message || "غير معروف"}`
      );
    }

    return send(
      `تمت إضافة ${userName || "المستخدم"} إلى المجموعة بنجاح.\n\n` +
      `ID: ${userID}`
    );

  } catch (error) {
    console.error("[ضيفي] Error:", error);

    return send(
      `حدث خطأ أثناء تنفيذ الأمر.\n\n` +
      `السبب: ${error.message || "غير معروف"}`
    );
  }
};
