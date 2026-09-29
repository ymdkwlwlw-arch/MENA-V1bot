module.exports.config = {
  name: "cmd",
  version: "2.0.0",
  hasPermssion: 2,
  credits: "محمد إدريس",
  description: "إدارة وتحكم في أوامر البوت",
  usePrefix: true,
  commandCategory: "المطور",
  usages: "cmd load | unload | reload | loadAll | unloadAll | info",
  cooldowns: 3
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;

  const send = msg =>
    api.sendMessage(msg, threadID, messageID);

  const action = String(args[0] || "").toLowerCase();
  const moduleName = args.slice(1).join(" ").trim();

  /*
   * تحميل أمر
   */
  async function load(name) {
    if (!name) {
      return send(
        "اسم الأمر غير موجود.\n\n" +
        "الاستخدام:\n" +
        "cmd load اسم الأمر"
      );
    }

    try {
      const fileName = name.endsWith(".js")
        ? name
        : `${name}.js`;

      const commandPath = require("path").join(
        __dirname,
        fileName
      );

      if (!require("fs").existsSync(commandPath)) {
        return send(
          `الأمر ${name} غير موجود.`
        );
      }

      delete require.cache[
        require.resolve(commandPath)
      ];

      const command = require(commandPath);

      if (
        !command.config ||
        !command.config.name ||
        typeof command.run !== "function"
      ) {
        return send(
          `تعذر تحميل ${name}.\nملف الأمر غير صالح.`
        );
      }

      global.client.commands.set(
        command.config.name,
        command
      );

      return send(
        `تم تحميل الأمر بنجاح.\n\n` +
        `الاسم: ${command.config.name}\n` +
        `الإصدار: ${command.config.version || "غير محدد"}`
      );

    } catch (error) {
      console.error("[cmd load]", error);

      return send(
        `فشل تحميل الأمر ${name}.\n\n` +
        `الخطأ: ${error.message || "غير معروف"}`
      );
    }
  }

  /*
   * إعادة تحميل أمر
   */
  async function reload(name) {
    if (!name) {
      return send(
        "حدد اسم الأمر الذي تريد إعادة تحميله.\n\n" +
        "مثال:\n" +
        "cmd reload لينا"
      );
    }

    try {
      const fileName = name.endsWith(".js")
        ? name
        : `${name}.js`;

      const commandPath = require("path").join(
        __dirname,
        fileName
      );

      if (!require("fs").existsSync(commandPath)) {
        return send(
          `الأمر ${name} غير موجود.`
        );
      }

      delete require.cache[
        require.resolve(commandPath)
      ];

      const command = require(commandPath);

      if (
        !command.config ||
        !command.config.name ||
        typeof command.run !== "function"
      ) {
        return send(
          `فشل إعادة تحميل ${name}.\nملف الأمر غير صالح.`
        );
      }

      global.client.commands.delete(
        command.config.name
      );

      global.client.commands.set(
        command.config.name,
        command
      );

      return send(
        `تمت إعادة تحميل الأمر بنجاح.\n\n` +
        `الاسم: ${command.config.name}\n` +
        `الإصدار: ${command.config.version || "غير محدد"}`
      );

    } catch (error) {
      console.error("[cmd reload]", error);

      return send(
        `فشلت إعادة تحميل ${name}.\n\n` +
        `الخطأ: ${error.message || "غير معروف"}`
      );
    }
  }

  /*
   * تعطيل أمر
   */
  async function unload(name) {
    if (!name) {
      return send(
        "حدد اسم الأمر الذي تريد تعطيله."
      );
    }

    if (name === "cmd") {
      return send(
        "لا يمكن تعطيل أمر cmd من خلال نفسه."
      );
    }

    if (!global.client.commands.has(name)) {
      return send(
        `الأمر ${name} غير محمل حاليًا.`
      );
    }

    global.client.commands.delete(name);

    return send(
      `تم تعطيل الأمر ${name}.\n\n` +
      `يمكن إعادته باستخدام:\n` +
      `cmd load ${name}`
    );
  }

  /*
   * معلومات أمر
   */
  async function info(name) {
    if (!name) {
      return send(
        "حدد اسم الأمر.\n\n" +
        "مثال:\n" +
        "cmd info لينا"
      );
    }

    const command =
      global.client.commands.get(name);

    if (!command) {
      return send(
        `الأمر ${name} غير موجود أو غير محمل.`
      );
    }

    const config = command.config || {};

    const dependencies =
      config.dependencies &&
      typeof config.dependencies === "object"
        ? Object.keys(config.dependencies)
        : [];

    return send(
      `.... معلومات الأمر ....\n\n` +
      `الاسم: ${config.name || name}\n` +
      `الإصدار: ${config.version || "غير محدد"}\n` +
      `المطور: ${config.credits || "غير محدد"}\n` +
      `الصلاحية: ${config.hasPermssion ?? 0}\n` +
      `الفئة: ${config.commandCategory || "غير محددة"}\n` +
      `الانتظار: ${config.cooldowns || 0} ثانية\n` +
      `المكتبات: ${dependencies.join(", ") || "لا توجد"}`
    );
  }

  /*
   * إعادة تحميل جميع الأوامر
   */
  async function reloadAll() {
    try {
      const fs = require("fs");
      const path = require("path");

      const files = fs
        .readdirSync(__dirname)
        .filter(file =>
          file.endsWith(".js") &&
          file !== "cmd.js"
        );

      let loaded = 0;
      let failed = 0;

      for (const file of files) {
        try {
          const filePath = path.join(
            __dirname,
            file
          );

          delete require.cache[
            require.resolve(filePath)
          ];

          const command = require(filePath);

          if (
            !command.config ||
            !command.config.name ||
            typeof command.run !== "function"
          ) {
            failed++;
            continue;
          }

          global.client.commands.set(
            command.config.name,
            command
          );

          loaded++;

        } catch (error) {
          failed++;
          console.error(
            `[cmd reloadAll] ${file}:`,
            error.message
          );
        }
      }

      return send(
        `.... إعادة تحميل الأوامر ....\n\n` +
        `تم التحميل: ${loaded}\n` +
        `فشل: ${failed}\n\n` +
        `اكتملت العملية.`
      );

    } catch (error) {
      return send(
        `فشلت إعادة تحميل الأوامر.\n\n` +
        `الخطأ: ${error.message || "غير معروف"}`
      );
    }
  }

  /*
   * قائمة الأوامر
   */
  if (!action) {
    return send(
      `..... نظام التحكم بالأوامر .....

` +
      `cmd load اسم
` +
      `cmd unload اسم
` +
      `cmd reload اسم
` +
      `cmd reloadAll
` +
      `cmd info اسم

` +
      `مثال:
` +
      `cmd reload لينا`
    );
  }

  switch (action) {
    case "load":
      return load(moduleName);

    case "unload":
      return unload(moduleName);

    case "reload":
      return reload(moduleName);

    case "reloadall":
      return reloadAll();

    case "info":
      return info(moduleName);

    default:
      return send(
        `الأمر غير معروف.

` +
        `الأوامر المتاحة:
` +
        `cmd load اسم
` +
        `cmd unload اسم
` +
        `cmd reload اسم
` +
        `cmd reloadAll
` +
        `cmd info اسم`
      );
  }
};
