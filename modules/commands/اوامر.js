module.exports.config = {
  name: "اوامر",
  version: "2.1.0",
  hasPermission: 0,
  credits: "Yan Maglinte | تعديل: محمد إدريس",
  description: "عرض جميع أوامر البوت",
  usePrefix: true,
  commandCategory: "guide",
  usages: "اوامر أو اوامر اسم_الأمر",
  cooldowns: 5,
  envConfig: {
    autoUnsend: true,
    delayUnsend: 60
  }
};

module.exports.languages = {
  en: {
    moduleInfo:
      "╭─  ── ── ── ──  ─╮\n" +
      "     مـعـلـومـات الأمـر\n" +
      "╰─  ── ── ── ──  ─╯\n" +
      "⎔ الاسم: %1\n" +
      "⎔ الوصف: %2\n" +
      "⎔ الاستخدام: %3\n" +
      "⎔ الصلاحية: %4\n" +
      "⎔ الانتظار: %5 ثانية\n" +
      "⊞ المطور: %6\n" +
      "── ── ── ── ── ── ──",

    user: "عام",
    adminGroup: "مسؤول مجموعة",
    adminBot: "مطور"
  }
};

module.exports.run = async function ({ api, event, args, getText }) {
  const { commands } = global.client;
  const { threadID, messageID } = event;

  const threadSetting =
    global.data.threadData.get(parseInt(threadID)) || {};

  const prefix = threadSetting.hasOwnProperty("PREFIX")
    ? threadSetting.PREFIX
    : global.config.PREFIX;

  const configModule =
    global.configModule?.[this.config.name] || {};

  const autoUnsend =
    configModule.autoUnsend !== false;

  const delayUnsend =
    Number(configModule.delayUnsend) || 60;

  const requested = String(args[0] || "").trim();

  /*
   * معلومات أمر محدد
   */

  if (requested && isNaN(requested)) {
    const command = commands.get(requested.toLowerCase());

    if (!command) {
      return api.sendMessage(
        `لم يتم العثور على الأمر: ${requested}`,
        threadID,
        messageID
      );
    }

    const permission =
      Number(command.config.hasPermission || 0) === 0
        ? getText("user")
        : Number(command.config.hasPermission || 0) === 1
        ? getText("adminGroup")
        : getText("adminBot");

    const message = getText(
      "moduleInfo",
      command.config.name,
      command.config.description || "بدون وصف",
      `${prefix}${command.config.name} ${
        command.config.usages || ""
      }`,
      permission,
      command.config.cooldowns || 0,
      command.config.credits || "غير معروف"
    );

    return api.sendMessage(
      message,
      threadID,
      messageID
    );
  }

  /*
   * جميع الأوامر
   */

  const allCommands = Array.from(commands.values())
    .filter(command => command && command.config)
    .filter((command, index, array) => {
      return array.findIndex(
        item =>
          item.config &&
          item.config.name === command.config.name
      ) === index;
    });

  /*
   * عام
   * صلاحية 0 و 1
   */

  const generalCommands = allCommands
    .filter(command => {
      return Number(command.config.hasPermission || 0) < 2;
    })
    .map(command => command.config.name)
    .filter(Boolean);

  /*
   * مطور
   * صلاحية 2 أو أعلى
   */

  const developerCommands = allCommands
    .filter(command => {
      return Number(command.config.hasPermission || 0) >= 2;
    })
    .map(command => command.config.name)
    .filter(Boolean);

  /*
   * بناء القائمة
   */

  let body =
    "╭─  ── ── ── ──  ─╮\n" +
    "     نـظـام الأوامـر\n" +
    "╰─  ── ── ── ──  ─╯\n\n";

  body +=
    "⎔ عـام\n" +
    "⊞ " +
    (
      generalCommands.length
        ? generalCommands.join(" • ")
        : "لا توجد أوامر"
    ) +
    "\n\n";

  body +=
    "⎔ مـطـور\n" +
    "⊞ " +
    (
      developerCommands.length
        ? developerCommands.join(" • ")
        : "لا توجد أوامر"
    ) +
    "\n\n";

  body +=
    "── ── ── ── ── ── ──\n" +
    `⎔ إجـمـالـي الأوامـر: ${allCommands.length}\n` +
    `⊞ لـمـعـرفـة تـفـاصـيـل أمـر: ${prefix}اوامر اسم_الأمر\n` +
    "── ── ── ── ── ── ──";

  try {
    const sentMessage = await api.sendMessage(
      body,
      threadID,
      messageID
    );

    if (
      autoUnsend &&
      sentMessage &&
      sentMessage.messageID
    ) {
      setTimeout(async () => {
        try {
          await api.unsendMessage(
            sentMessage.messageID
          );
        } catch (error) {
          console.error(
            "[اوامر] Auto-unsend failed:",
            error.message
          );
        }
      }, delayUnsend * 1000);
    }

    return sentMessage;

  } catch (error) {
    console.error(
      "[اوامر] Error:",
      error
    );

    return api.sendMessage(
      `حدث خطأ أثناء عرض الأوامر.\nالسبب: ${
        error.message || "غير معروف"
      }`,
      threadID,
      messageID
    );
  }
};
