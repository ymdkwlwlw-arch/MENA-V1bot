const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const vm = require("vm");
const FormData = require("form-data");

module.exports.config = {
    name: "adc",
    version: "4.0.0",
    hasPermssion: 2,
    credits: "KIROS",
    description: "تحديث وتصدير أوامر البوت مع النسخ الاحتياطي والفحص",
    usePrefix: true,
    commandCategory: "Admin",
    usages: "adc update/export/info اسم_الأمر",
    cooldowns: 5,
    dependencies: {
        "axios": "",
        "fs-extra": "",
        "form-data": ""
    }
};

/* =========================================================
   إعدادات النظام
========================================================= */

const DEVELOPER_ID = "61593519041412";

const COMMAND_DIR = __dirname;
const BACKUP_DIR = path.join(
    COMMAND_DIR,
    "cache",
    "adc-backup"
);

const MAX_CODE_SIZE = 2 * 1024 * 1024;

/* =========================================================
   فحص الكود
========================================================= */

const blockedPatterns = [
    /\bprocess\.binding\b/i,
    /\bprocess\.dlopen\b/i,
    /\brequire\s*\(\s*['"]child_process['"]\s*\)/i,
    /\bchild_process\b/i,
    /\bexec\s*\(/i,
    /\bexecFile\s*\(/i,
    /\bspawn\s*\(/i,
    /\bspawnSync\s*\(/i,
    /\bexecSync\s*\(/i
];

function isDeveloper(event) {
    return String(event.senderID) === DEVELOPER_ID;
}

function isSafeName(name) {
    return (
        typeof name === "string" &&
        /^[a-zA-Z0-9_\u0600-\u06FF-]{1,50}$/.test(name)
    );
}

function getCommandPath(commandName) {
    if (!isSafeName(commandName)) {
        return null;
    }

    const filePath = path.resolve(
        COMMAND_DIR,
        `${commandName}.js`
    );

    const baseDir = path.resolve(COMMAND_DIR);

    if (
        filePath !== path.join(baseDir, `${commandName}.js`)
    ) {
        return null;
    }

    return filePath;
}

function extractURL(text) {
    if (!text) return null;

    const match = String(text).match(
        /https?:\/\/[^\s<>"']+/i
    );

    return match
        ? match[0].replace(/[),.;]+$/, "")
        : null;
}

function checkCode(code) {
    if (
        typeof code !== "string" ||
        !code.trim()
    ) {
        return {
            ok: false,
            reason: "الكود فارغ."
        };
    }

    if (Buffer.byteLength(code, "utf8") > MAX_CODE_SIZE) {
        return {
            ok: false,
            reason: "حجم الكود أكبر من الحد المسموح."
        };
    }

    if (code.trim().length < 20) {
        return {
            ok: false,
            reason: "الكود قصير جدًا."
        };
    }

    for (const pattern of blockedPatterns) {
        if (pattern.test(code)) {
            return {
                ok: false,
                reason: "تم العثور على جزء غير مسموح به داخل الكود."
            };
        }
    }

    try {
        new vm.Script(code, {
            filename: "adc-check.js"
        });
    } catch (error) {
        return {
            ok: false,
            reason: `خطأ JavaScript: ${error.message}`
        };
    }

    if (
        !code.includes("module.exports") &&
        !code.includes("exports.")
    ) {
        return {
            ok: false,
            reason:
                "الملف لا يبدو كأمر BotPack صالح."
        };
    }

    return {
        ok: true
    };
}

/* =========================================================
   تحميل كود من رابط
========================================================= */

async function downloadCode(url) {
    const response = await axios.get(url, {
        timeout: 30000,
        responseType: "text",
        maxContentLength: MAX_CODE_SIZE,
        headers: {
            "User-Agent": "KIROS-ADC/4.0"
        }
    });

    if (typeof response.data !== "string") {
        throw new Error(
            "الرابط لم يُرجع كود JavaScript نصيًا."
        );
    }

    return response.data;
}

/* =========================================================
   تحميل الأمر داخل BotPack
========================================================= */

function loadCommand(filePath) {
    try {
        delete require.cache[
            require.resolve(filePath)
        ];

        const command = require(filePath);

        if (
            !command ||
            typeof command !== "object"
        ) {
            throw new Error(
                "الملف لا يحتوي على module صالح."
            );
        }

        if (
            !command.config ||
            !command.config.name
        ) {
            throw new Error(
                "module.exports.config غير موجود."
            );
        }

        if (
            typeof command.run !== "function"
        ) {
            throw new Error(
                "module.exports.run غير موجود."
            );
        }

        /*
         * دعم أنظمة BotPack المختلفة
         */

        if (
            global.client &&
            global.client.commands
        ) {
            const commands =
                global.client.commands;

            if (
                typeof commands.set ===
                "function"
            ) {
                commands.set(
                    command.config.name,
                    command
                );

                if (
                    Array.isArray(
                        command.config.aliases
                    )
                ) {
                    for (
                        const alias of
                        command.config.aliases
                    ) {
                        if (alias) {
                            commands.set(
                                alias,
                                command
                            );
                        }
                    }
                }
            }
        }

        return {
            ok: true,
            command
        };

    } catch (error) {
        return {
            ok: false,
            reason: error.message
        };
    }
}

/* =========================================================
   رفع ملف الأمر
========================================================= */

async function uploadFile(filePath) {
    const form = new FormData();

    form.append(
        "file",
        fs.createReadStream(filePath)
    );

    const response = await axios.post(
        "https://tmpfiles.org/api/v1/upload",
        form,
        {
            headers: form.getHeaders(),
            timeout: 60000,
            maxContentLength:
                20 * 1024 * 1024,
            maxBodyLength:
                20 * 1024 * 1024
        }
    );

    const data = response.data;

    if (
        !data ||
        data.status !== "success" ||
        !data.data ||
        !data.data.url
    ) {
        throw new Error(
            "خدمة رفع الملفات لم تُرجع رابطًا صالحًا."
        );
    }

    /*
     * tmpfiles يرجع رابط صفحة الملف:
     * https://tmpfiles.org/123456/file.js
     *
     * نحوله إلى رابط التحميل المباشر:
     * https://tmpfiles.org/dl/123456/file.js
     */

    return String(data.data.url).replace(
        "https://tmpfiles.org/",
        "https://tmpfiles.org/dl/"
    );
}

/* =========================================================
   تنسيق الرسائل
========================================================= */

function header(title = "نـظـام ADC") {
    return (
        "╭─  ── ── ── ──  ─╮\n" +
        `     ${title}\n` +
        "╰─  ── ── ── ──  ─╯"
    );
}

function footer() {
    return "── ── ── ── ── ── ──";
}

/* =========================================================
   معلومات الأمر
========================================================= */

function getCommandInfo(commandName) {
    const filePath =
        getCommandPath(commandName);

    if (!filePath) {
        throw new Error(
            "اسم الأمر غير صالح."
        );
    }

    if (!fs.existsSync(filePath)) {
        throw new Error(
            "الأمر غير موجود."
        );
    }

    const code = fs.readFileSync(
        filePath,
        "utf8"
    );

    let command;

    try {
        delete require.cache[
            require.resolve(filePath)
        ];

        command = require(filePath);
    } catch (error) {
        throw new Error(
            `تعذر قراءة الأمر: ${error.message}`
        );
    }

    const stat =
        fs.statSync(filePath);

    return {
        filePath,
        code,
        command,
        size: stat.size,
        modified: stat.mtime
    };
}

/* =========================================================
   التشغيل
========================================================= */

module.exports.run = async function ({
    api,
    event,
    args
}) {

    const {
        threadID,
        messageID,
        messageReply
    } = event;

    const send = text =>
        api.sendMessage(
            text,
            threadID,
            messageID
        );

    /*
     * المطور فقط
     */

    if (!isDeveloper(event)) {
        return send(
            header("نـظـام ADC") +
            "\n" +
            "⎔ الـحـالـة: مـرفـوض\n" +
            "⊞ هـذا الأمـر مـخـصـص لـلـمـطـور فـقـط\n" +
            footer()
        );
    }

    const action =
        String(args[0] || "").toLowerCase();

    const commandName =
        args[1];

    /*
     * المساعدة
     */

    if (
        !action ||
        action === "help" ||
        action === "مساعدة"
    ) {
        return send(
            header("نـظـام ADC V4") +
            "\n" +
            "⎔ update اسم_الأمر\n" +
            "⊞ تـحـديـث أمـر مـن رابـط\n\n" +

            "⎔ export اسم_الأمر\n" +
            "⊞ تـصـديـر كـود الأمـر كـرابـط\n\n" +

            "⎔ info اسم_الأمر\n" +
            "⊞ عـرض مـعـلـومـات الأمـر\n\n" +

            footer()
        );
    }

    /*
     * التحقق من اسم الأمر
     */

    if (
        ["update", "export", "info"].includes(action) &&
        !isSafeName(commandName)
    ) {
        return send(
            header("نـظـام ADC") +
            "\n" +
            "⎔ الـحـالـة: خـطـأ\n" +
            "⊞ اسـم الأمـر غـيـر صـالـح\n" +
            footer()
        );
    }

    /* =====================================================
       UPDATE
    ===================================================== */

    if (
        action === "update" ||
        action === "تحديث"
    ) {

        const url =
            extractURL(
                messageReply?.body
            );

        if (!url) {
            return send(
                header("تـحـديـث الأمـر") +
                "\n" +
                "⎔ لـم يـتـم الـعـثـور عـلـى رابـط\n" +
                "⊞ الـرد عـلـى رسـالـة تـحـتـوي عـلـى رابـط JavaScript\n" +
                footer()
            );
        }

        try {
            await api.setMessageReaction(
                "⏳",
                messageID,
                threadID
            );
        } catch (e) {}

        const filePath =
            getCommandPath(
                commandName
            );

        const backupPath =
            path.join(
                BACKUP_DIR,
                `${commandName}_${Date.now()}.js`
            );

        try {

            await fs.ensureDir(
                BACKUP_DIR
            );

            const code =
                await downloadCode(url);

            const check =
                checkCode(code);

            if (!check.ok) {

                try {
                    await api.setMessageReaction(
                        "❌",
                        messageID,
                        threadID
                    );
                } catch (e) {}

                return send(
                    header("تـحـديـث الأمـر") +
                    "\n" +
                    "⎔ الـحـالـة: تـم رفـض الـكـود\n" +
                    `⊞ الـسـبـب: ${check.reason}\n` +
                    footer()
                );
            }

            /*
             * النسخة القديمة
             */

            if (
                fs.existsSync(filePath)
            ) {
                await fs.copy(
                    filePath,
                    backupPath
                );
            }

            /*
             * كتابة النسخة الجديدة
             */

            await fs.writeFile(
                filePath,
                code,
                "utf8"
            );

            /*
             * تجربة التحميل
             */

            const loaded =
                loadCommand(
                    filePath
                );

            if (!loaded.ok) {

                if (
                    fs.existsSync(
                        backupPath
                    )
                ) {
                    await fs.copy(
                        backupPath,
                        filePath
                    );
                }

                delete require.cache[
                    require.resolve(filePath)
                ];

                try {
                    await api.setMessageReaction(
                        "❌",
                        messageID,
                        threadID
                    );
                } catch (e) {}

                return send(
                    header("تـحـديـث الأمـر") +
                    "\n" +
                    "⎔ الـحـالـة: فـشـل الـتـحـمـيـل\n" +
                    `⊞ الـسـبـب: ${loaded.reason}\n` +
                    "⊞ تـمـت إعـادة الـنـسـخـة الـسـابـقـة\n" +
                    footer()
                );
            }

            try {
                await api.setMessageReaction(
                    "✅",
                    messageID,
                    threadID
                );
            } catch (e) {}

            return send(
                header("تـحـديـث الأمـر") +
                "\n" +
                `⎔ الأمـر: ${commandName}\n` +
                "⎔ الـحـالـة: تـم الـتـحـديـث بـنـجـاح\n" +
                "⊞ فـحـص JavaScript: نـاجـح\n" +
                "⊞ النسخة القديمة: تـم حـفـظـهـا\n" +
                footer()
            );

        } catch (error) {

            console.error(
                "[ADC UPDATE]",
                error
            );

            try {
                await api.setMessageReaction(
                    "❌",
                    messageID,
                    threadID
                );
            } catch (e) {}

            return send(
                header("تـحـديـث الأمـر") +
                "\n" +
                "⎔ الـحـالـة: حـدث خـطـأ\n" +
                `⊞ الـسـبـب: ${error.message}` +
                "\n" +
                footer()
            );
        }
    }

    /* =====================================================
       EXPORT
    ===================================================== */

    if (
        action === "export" ||
        action === "تصدير"
    ) {

        try {
            await api.setMessageReaction(
                "⏳",
                messageID,
                threadID
            );
        } catch (e) {}

        try {

            const info =
                getCommandInfo(
                    commandName
                );

            /*
             * لا نسمح بتصدير ملف غير JavaScript
             */

            const check =
                checkCode(info.code);

            if (!check.ok) {
                throw new Error(
                    `فشل فحص الأمر: ${check.reason}`
                );
            }

            const url =
                await uploadFile(
                    info.filePath
                );

            try {
                await api.setMessageReaction(
                    "✅",
                    messageID,
                    threadID
                );
            } catch (e) {}

            return send(
                header("تـصـديـر الأمـر") +
                "\n" +
                `⎔ الأمـر: ${commandName}\n` +
                `⊞ الـحـجـم: ${info.size} bytes\n` +
                "⊞ الـحـالـة: تـم الـرفـع بـنـجـاح\n\n" +
                `🔗 الـرابـط:\n${url}\n\n` +
                "⊞ الـرابـط مـؤقـت، احـفـظ الـكـود فـي GitHub إذا كـان مـطـلـوبـًا لـلـحـفـظ الـدائـم\n" +
                footer()
            );

        } catch (error) {

            console.error(
                "[ADC EXPORT]",
                error
            );

            try {
                await api.setMessageReaction(
                    "❌",
                    messageID,
                    threadID
                );
            } catch (e) {}

            return send(
                header("تـصـديـر الأمـر") +
                "\n" +
                "⎔ الـحـالـة: فـشـل الـرفـع\n" +
                `⊞ الـسـبـب: ${error.message}` +
                "\n" +
                footer()
            );
        }
    }

    /* =====================================================
       INFO
    ===================================================== */

    if (
        action === "info" ||
        action === "معلومات"
    ) {

        try {

            const info =
                getCommandInfo(
                    commandName
                );

            const config =
                info.command.config || {};

            const aliases =
                Array.isArray(
                    config.aliases
                )
                    ? config.aliases.join(", ")
                    : "لا يوجد";

            return send(
                header("مـعـلـومـات الأمـر") +
                "\n" +
                `⎔ الاسم: ${config.name || commandName}\n` +
                `⎔ الإصدار: ${config.version || "غير محدد"}\n` +
                `⎔ المطور: ${config.credits || "غير محدد"}\n` +
                `⎔ القسم: ${config.commandCategory || "غير محدد"}\n` +
                `⎔ الصلاحية: ${config.hasPermssion ?? "غير محدد"}\n` +
                `⊞ الاختصارات: ${aliases}\n` +
                `⊞ الحجم: ${info.size} bytes\n` +
                `⊞ آخر تعديل: ${info.modified.toLocaleString()}\n` +
                `⊞ run: ${typeof info.command.run === "function" ? "OK" : "ERROR"}\n` +
                `⊞ الملف: ${path.basename(info.filePath)}\n` +
                footer()
            );

        } catch (error) {

            return send(
                header("مـعـلـومـات الأمـر") +
                "\n" +
                "⎔ الـحـالـة: فـشـل\n" +
                `⊞ الـسـبـب: ${error.message}\n` +
                footer()
            );
        }
    }

    return send(
        header("نـظـام ADC V4") +
        "\n" +
        "⎔ أمـر غـيـر مـعـروف\n" +
        "⊞ استخدم: adc help\n" +
        footer()
    );
};
