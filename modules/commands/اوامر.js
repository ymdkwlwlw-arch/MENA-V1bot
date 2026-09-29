module.exports.config = {
  name: "اوامر",
  version: "2.3.0",
  hasPermssion: 0,
  credits: "محمد إدريس",
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

module.exports.run = async function ({
  api,
  event,
  args,
  getText
}) {
  const { threadID, messageID } = event;
  const { commands } = global.client;

  /*
   * البادئة
   */

  const threadSetting =
    global.data?.threadData?.get(parseInt(threadID)) || {};

  const prefix =
    threadSetting.PREFIX ||
    global.config?.PREFIX ||
    "";

  /*
   * قراءة صلاحية الأمر
   *
   * BotPack يستخدم:
   * hasPermssion
   *
   * مع دعم:
   * hasPermission
   */

  const getPermission = command => {
    if (!command?.config) return 0;

    const permission =
      command.config.hasPermssion ??
      command.config.hasPermission ??
      0;

    const number = Number(permission);

    return Number.isNaN(number) ? 0 : number;
  };

  /*
   * معلومات أمر محدد
   */

  const requested = String(args[0] || "").trim();

  if (requested && isNaN(requested)) {
    const command = commands.get(
      requested.toLowerCase()
    );

    if (!command) {
      return api.sendMessage(
        `لم يتم العثور على الأمر: ${requested}`,
        threadID,
        messageID
      );
    }

    const permission =
      getPermission(command);

    let permissionName = "عام";

    if (permission === 1) {
      permissionName = "مسؤول مجموعة";
    }

    if (permission >= 2) {
      permissionName = "مطور";
    }

    const message = getText(
      "moduleInfo",
      command.config.name,
      command.config.description || "بدون وصف",
      `${prefix}${command.config.name} ${
        command.config.usages || ""
      }`,
      permissionName,
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

  const allCommands = Array.from(
    commands.values()
  )
    .filter(command =>
      command &&
      command.config &&
      command.config.name
    )
    .filter((command, index, array) => {
      return (
        array.findIndex(item =>
          item.config &&
          item.config.name === command.config.name
        ) === index
      );
    });

  /*
   * الأوامر العامة
   *
   * صلاحية 0 و 1
   */

  const generalCommands = allCommands
    .filter(command =>
      getPermission(command) < 2
    )
    .map(command =>
      command.config.name
    )
    .filter(Boolean);

  /*
   * أوامر المطور
   *
   * صلاحية 2 أو أعلى
   */

  const developerCommands = allCommands
    .filter(command =>
      getPermission(command) >= 2
    )
    .map(command =>
      command.config.name
    )
    .filter(Boolean);

  /*
   * القائمة
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

  /*
   * إرسال القائمة
   */

  try {
    const sentMessage =
      await api.sendMessage(
        body,
        threadID,
        messageID
      );

    /*
     * الحذف التلقائي
     */

    const configModule =
      global.configModule?.[this.config.name] || {};

    const autoUnsend =
      configModule.autoUnsend !== false;

    const delayUnsend =
      Number(configModule.delayUnsend) || 60;

    if (
      autoUnsend &&
      sentMessage?.messageID
    ) {
      setTimeout(async () => {
        try {
          await api.unsendMessage(
            sentMessage.messageID
          );
        } catch (error) {
          console.error(
            "[اوامر] Auto-unsend:",
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
