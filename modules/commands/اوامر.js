const axios = require("axios");

module.exports.config = {
  name: "اوامر",
  version: "3.0.0",
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
      "╭─── ◸ مـعـلـومـات الأمـر ◿ ───╮\n\n" +
      "⊸ الاسم     : %1\n" +
      "⊸ الوصف     : %2\n" +
      "⊸ الاستخدام : %3\n" +
      "⊸ الصلاحية  : %4\n" +
      "⊸ الانتظار  : %5 ثانية\n" +
      "⊸ المطور    : %6\n\n" +
      "╰──────────────────────────╯",

    user: "عام",
    adminGroup: "مسؤول مجموعة",
    adminBot: "مطور"
  }
};

/*
 * صورة قائمة الأوامر
 */
const MENU_IMAGE =
  "https://i.imgur.com/j0P8sSf.jpeg";


/*
 * تحويل الصلاحية إلى اسم
 */
function getPermission(command) {
  if (!command?.config) return 0;

  const permission =
    command.config.hasPermssion ??
    command.config.hasPermission ??
    0;

  const number = Number(permission);

  return Number.isNaN(number) ? 0 : number;
}


/*
 * أسماء الأقسام
 */
function getCategoryName(category) {
  const categories = {
    "خدمات": "قـسـم الـخـدمـات",
    "وسائط": "قـسـم الـوسـائـط",
    "ترفيه": "قـسـم الـتـرفـيـه",
    "تسلية": "قـسـم الـتـرفـيـه",
    "العاب": "قـسـم الألعاب",
    "ألعاب": "قـسـم الألعاب",
    "ذكاء اصطناعي": "قـسـم الـذكـاء الاصـطـنـاعـي",
    "AI": "قـسـم الـذكـاء الاصـطـنـاعـي",
    "معلومات": "قـسـم الـمـعـلـومـات",
    "رسائل": "قـسـم الـرسـائـل",
    "نظام": "قـسـم الـنـظـام",
    "إدارة": "قـسـم الإدارة",
    "Admin": "قـسـم الإدارة",
    "guide": "قـسـم الـدلـيـل"
  };

  return categories[category] ||
    `قـسـم ${category || "أخرى"}`;
}


/*
 * الوقت والتاريخ
 */
function getDateInfo() {
  const now = new Date();

  const date = now.toLocaleDateString("ar", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });

  const day = now.toLocaleDateString("ar", {
    weekday: "long"
  });

  const time = now.toLocaleTimeString("ar", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });

  return {
    date,
    day,
    time
  };
}


/*
 * ترتيب الأوامر داخل الأقسام
 */
function buildCategories(commands) {
  const categories = new Map();

  for (const command of commands) {
    if (!command?.config?.name) continue;

    const permission = getPermission(command);

    /*
     * أوامر المطور لا تظهر للمستخدمين العاديين
     */
    if (permission >= 2) continue;

    const category =
      command.config.commandCategory ||
      command.config.category ||
      "أخرى";

    if (!categories.has(category)) {
      categories.set(category, []);
    }

    categories.get(category).push(
      command.config.name
    );
  }

  /*
   * ترتيب أبجدي داخل كل قسم
   */
  for (const list of categories.values()) {
    list.sort((a, b) =>
      a.localeCompare(b, "ar")
    );
  }

  return categories;
}


module.exports.run = async function ({
  api,
  event,
  args,
  getText
}) {
  const {
    threadID,
    messageID
  } = event;

  const commands =
    global.client?.commands;

  if (!commands) {
    return api.sendMessage(
      "تعذر الوصول إلى نظام الأوامر.",
      threadID,
      messageID
    );
  }

  /*
   * البادئة
   */
  const threadSetting =
    global.data?.threadData?.get(
      parseInt(threadID)
    ) || {};

  const prefix =
    threadSetting.PREFIX ||
    global.config?.PREFIX ||
    "/";


  /*
   * أمر محدد
   */
  const requested =
    String(args[0] || "").trim();

  if (
    requested &&
    isNaN(requested)
  ) {
    const command =
      commands.get(
        requested.toLowerCase()
      );

    if (!command) {
      return api.sendMessage(
        `╭─── ◸ خـطـأ ◿ ───╮\n\n` +
        `⊸ لم يتم العثور على الأمر:\n` +
        `⊸ ${requested}\n\n` +
        `╰────────────────╯`,
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

    const message =
      getText(
        "moduleInfo",
        command.config.name,
        command.config.description ||
          "بدون وصف",
        `${prefix}${command.config.name} ${
          command.config.usages || ""
        }`,
        permissionName,
        command.config.cooldowns || 0,
        command.config.credits ||
          "غير معروف"
      );

    return api.sendMessage(
      message,
      threadID,
      messageID
    );
  }


  /*
   * جمع الأوامر
   */
  const allCommands =
    Array.from(commands.values())
      .filter(command =>
        command &&
        command.config &&
        command.config.name
      )
      .filter((command, index, array) => {
        return (
          array.findIndex(item =>
            item.config &&
            item.config.name ===
              command.config.name
          ) === index
        );
      });


  /*
   * إجمالي الأوامر الظاهرة
   */
  const visibleCommands =
    allCommands.filter(
      command =>
        getPermission(command) < 2
    );


  /*
   * بناء الأقسام
   */
  const categories =
    buildCategories(
      visibleCommands
    );


  /*
   * معلومات الوقت
   */
  const dateInfo =
    getDateInfo();


  /*
   * بداية القائمة
   */
  let body =
    "╭─── ◸ نـظـام الـبـوت ◿ ───╮\n" +
    "│\n" +
    `│ ⌁ الـتـاريـخ  ─ ${dateInfo.date}\n` +
    `│ ⌁ الـيـوم     ─ ${dateInfo.day}\n` +
    `│ ⌁ الـوقـت     ─ ${dateInfo.time}\n` +
    "│\n" +
    "╰──────────────────────────╯\n\n";


  /*
   * عنوان الأوامر
   */
  body +=
    "╭─── ◸ قـائـمـة الأوامـر ◿ ───╮\n" +
    "│\n";


  /*
   * الأقسام
   */
  let categoryIndex = 0;

  for (const [
    category,
    commandList
  ] of categories) {

    if (!commandList.length) {
      continue;
    }

    body +=
      `│ ⟐ ${getCategoryName(category)}\n` +
      "│\n";

    /*
     * تقسيم الأوامر إلى 3 في السطر
     */
    for (
      let i = 0;
      i < commandList.length;
      i += 3
    ) {
      const row =
        commandList.slice(
          i,
          i + 3
        );

      body +=
        "│ ⊸ " +
        row.join("  •  ") +
        "\n";
    }

    categoryIndex++;

    /*
     * فاصل بين الأقسام
     */
    if (
      categoryIndex <
      categories.size
    ) {
      body +=
        "│\n" +
        "│ ───────────────────────\n" +
        "│\n";
    }
  }


  /*
   * نهاية قائمة الأوامر
   */
  body +=
    "│\n" +
    "╰──────────────────────────╯\n\n";


  /*
   * معلومات البوت
   */
  body +=
    "╭─── ◸ مـعـلـومـات الـبـوت ◿ ───╮\n" +
    "│\n" +
    `│ ⟐ إجـمـالـي الأوامـر  ─ ${visibleCommands.length}\n` +
    "│ ⟐ حـالـة الـنـظـام     ─ متصل ✓\n" +
    "│ ⟐ الـمـطـور            ─ ڪولو سآن\n" +
    "│\n" +
    `│ ⊸ لمعرفة التفاصيل:\n` +
    `│   ${prefix}اوامر اسم_الأمر\n` +
    "│\n" +
    "╰──────────────────────────╯\n\n" +
    "اللهم صلِّ وسلم على سيدنا محمد 🌸";


  /*
   * تحميل الصورة وإرسالها
   */
  try {
    const imageResponse =
      await axios.get(
        MENU_IMAGE,
        {
          responseType: "arraybuffer",
          timeout: 15000,
          maxContentLength:
            10 * 1024 * 1024,
          maxBodyLength:
            10 * 1024 * 1024
        }
      );

    const imageBuffer =
      Buffer.from(
        imageResponse.data
      );


    /*
     * إرسال النص + الصورة
     * في رسالة واحدة
     */
    const sentMessage =
      await api.sendMessage(
        {
          body: body,
          attachment: imageBuffer
        },
        threadID,
        messageID
      );


    /*
     * الحذف التلقائي
     */
    const configModule =
      global.configModule?.[
        this.config.name
      ] || {};

    const autoUnsend =
      configModule.autoUnsend !== false;

    const delayUnsend =
      Number(
        configModule.delayUnsend
      ) || 60;

    if (
      autoUnsend &&
      sentMessage?.messageID
    ) {
      setTimeout(
        async () => {
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
        },
        delayUnsend * 1000
      );
    }

    return sentMessage;

  } catch (imageError) {

    /*
     * إذا فشل تحميل الصورة،
     * نرسل القائمة بدون صورة
     */
    console.error(
      "[اوامر] Image Error:",
      imageError.message
    );

    return api.sendMessage(
      body,
      threadID,
      messageID
    );
  }
};
