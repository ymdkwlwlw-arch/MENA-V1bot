const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "لاست",
  version: "3.0.0",
  hasPermssion: 0,
  credits: "محمد إدريس",
  description: "عرض وإدارة المجموعات التي يتواجد فيها البوت",
  usePrefix: true,
  commandCategory: "المطور",
  usages: "لاست | لاست حظر رقم | لاست خروج رقم",
  cooldowns: 5
};

const DEV_ID = "61593519041412";

const CACHE_DIR = path.join(__dirname, "cache");
const BLOCK_FILE = path.join(CACHE_DIR, "blockedGroups.json");

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

if (!fs.existsSync(BLOCK_FILE)) {
  fs.writeFileSync(BLOCK_FILE, "[]", "utf8");
}

function loadBlocked() {
  try {
    const data = JSON.parse(
      fs.readFileSync(BLOCK_FILE, "utf8")
    );

    return Array.isArray(data)
      ? data.map(String)
      : [];
  } catch {
    return [];
  }
}

function saveBlocked(list) {
  fs.writeFileSync(
    BLOCK_FILE,
    JSON.stringify([...new Set(list.map(String))], null, 2),
    "utf8"
  );
}

async function getGroups(api) {
  const threads = await api.getThreadList(
    100,
    null,
    ["INBOX"]
  );

  if (!Array.isArray(threads)) {
    return [];
  }

  return threads.filter(thread => {
    if (!thread || !thread.threadID) {
      return false;
    }

    return (
      thread.isGroup === true ||
      thread.threadType === "GROUP"
    );
  });
}

function getName(group) {
  return (
    group.name ||
    group.threadName ||
    "مجموعة بدون اسم"
  );
}

function send(api, event, message) {
  return api.sendMessage(
    message,
    event.threadID,
    event.messageID
  );
}

module.exports.run = async function ({
  api,
  event,
  args
}) {
  const {
    threadID,
    senderID
  } = event;

  // المطور فقط
  if (String(senderID) !== DEV_ID) {
    return send(
      api,
      event,
      "هذا الأمر خاص بالمطور."
    );
  }

  const action = String(args[0] || "")
    .trim()
    .toLowerCase();

  const number = Number(args[1]);

  try {
    const groups = await getGroups(api);

    /*
     * ─────────────────
     * تنفيذ حظر أو خروج
     * ─────────────────
     */

    if (
      action === "حظر" ||
      action === "خروج"
    ) {
      if (
        !Number.isInteger(number) ||
        number < 1
      ) {
        return send(
          api,
          event,
          "الاستخدام الصحيح:\n/لاست حظر رقم\n/لاست خروج رقم\n\nمثال:\n/لاست حظر 1\n/لاست خروج 3"
        );
      }

      const target = groups[number - 1];

      if (!target) {
        return send(
          api,
          event,
          `لا توجد مجموعة بالرقم ${number}.\nعدد المجموعات الحالية: ${groups.length}`
        );
      }

      const targetID = String(target.threadID);
      const targetName = getName(target);

      /*
       * حظر
       */
      if (action === "حظر") {
        const blocked = loadBlocked();

        if (!blocked.includes(targetID)) {
          blocked.push(targetID);
          saveBlocked(blocked);
        }
      }

      /*
       * خروج
       */
      await api.removeUserFromGroup(
        String(api.getCurrentUserID()),
        targetID
      );

      if (action === "حظر") {
        return send(
          api,
          event,
          `تم حظر المجموعة والخروج منها.\n\nالاسم: ${targetName}\nID: ${targetID}\nالرقم: ${number}`
        );
      }

      return send(
        api,
        event,
        `تم خروج البوت من المجموعة.\n\nالاسم: ${targetName}\nID: ${targetID}\nالرقم: ${number}`
      );
    }

    /*
     * ─────────────────
     * عرض المجموعات
     * ─────────────────
     */

    if (!groups.length) {
      return send(
        api,
        event,
        "البوت غير موجود في أي مجموعة حاليًا."
      );
    }

    const blocked = loadBlocked();

    let text =
      `المجموعات التي يتواجد فيها البوت:\n\n`;

    groups.forEach((group, index) => {
      const id = String(group.threadID);
      const name = getName(group);

      text +=
        `${index + 1}. ${name}\n` +
        `ID: ${id}\n` +
        `الحالة: ${
          blocked.includes(id)
            ? "محظورة"
            : "نشطة"
        }\n\n`;
    });

    text +=
      "استخدم:\n" +
      "/لاست حظر رقم\n" +
      "/لاست خروج رقم\n\n" +
      "مثال:\n" +
      "/لاست حظر 1\n" +
      "/لاست خروج 3";

    return send(api, event, text);

  } catch (error) {
    console.error(
      "[لاست] Error:",
      error
    );

    return send(
      api,
      event,
      `حدث خطأ أثناء تنفيذ الأمر.\n\nالخطأ: ${error.message || "غير معروف"}`
    );
  }
};
