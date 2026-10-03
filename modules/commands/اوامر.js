const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

module.exports.config = {
    name: "اوامر",
    version: "2.5.0",
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
            "╭─── ◸ مـعـلـومـات الأمـر ◿ ───╮\n" +
            "│\n" +
            "│ ◇ الاسـم      ─ %1\n" +
            "│ ◇ الـوصـف     ─ %2\n" +
            "│ ◇ الاسـتـخـدام ─ %3\n" +
            "│ ◇ الـصـلاحـيـة ─ %4\n" +
            "│ ◇ الانـتـظـار  ─ %5 ثـانـيـة\n" +
            "│ ◇ الـمـطـور    ─ %6\n" +
            "│\n" +
            "╰──────────────────────────╯",

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
        "/";

    /*
     * قراءة صلاحية الأمر
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
        const command =
            commands.get(requested.toLowerCase());

        if (!command) {
            return api.sendMessage(
                `╭─── ◸ نـظـام الأوامـر ◿ ───╮
│
│ ✕ لـم يـتـم الـعـثـور عـلـى الأمـر:
│
│ ⊸ ${requested}
│
╰──────────────────────────╯`,
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
            `${prefix}${command.config.name} ${command.config.usages || ""}`,
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
     * تنسيق الأوامر
     */

    const formatCommands = list => {
        if (!list.length) {
            return "│ ⊸ لا توجد أوامر";
        }

        const lines = [];

        for (let i = 0; i < list.length; i += 3) {
            const row = list
                .slice(i, i + 3)
                .join("  •  ");

            lines.push(`│ ⊸ ${row}`);
        }

        return lines.join("\n");
    };

    /*
     * التاريخ والوقت
     */

    const now = new Date();

    const date = now.toLocaleDateString(
        "ar",
        {
            day: "2-digit",
            month: "long",
            year: "numeric"
        }
    );

    const day = now.toLocaleDateString(
        "ar",
        {
            weekday: "long"
        }
    );

    const time = now.toLocaleTimeString(
        "ar",
        {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true
        }
    );

    /*
     * بناء القائمة
     */

    const body =
`╭─── ◸ نـظـام الـبـوت ◿ ───╮
│
│ ◸ الـتـاريـخ  ─ ${date}
│ ◸ الـيـوم     ─ ${day}
│ ◸ الـوقـت     ─ ${time}
│
╰──────────────────────────╯

╭─── ◸ قـائـمـة الأوامـر ◿ ───╮
│
│ ◇ الأوامـر الـعـامـة 〔${generalCommands.length}〕
│
${formatCommands(generalCommands)}
│
│ ╰─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ╯
│
│ ◇ أوامـر الـمـطـور 〔${developerCommands.length}〕
│
${formatCommands(developerCommands)}
│
╰──────────────────────────╯

╭─── ◸ مـعـلـومـات الـبـوت ◿ ───╮
│
│ ◇ المـالك  ─ ڪولو سان
│ ◇ اسـم الـبـوت  ─ لينا
│
│ ⊸ استخدم ${prefix}اوامر لعرض التفاصيل
│
╰──────────────────────────╯

اللهم صلِّ وسلم على سيدنا محمد 🌸`;

    /*
     * صورة القائمة
     */

    const imageUrl =
        "https://i.imgur.com/j0P8sSf.jpeg";

    /*
     * مجلد cache
     */

    const cacheDir =
        path.join(__dirname, "cache");

    const tempFile =
        path.join(
            cacheDir,
            `menu_${Date.now()}.jpg`
        );

    try {
        /*
         * إنشاء cache
         */

        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(
                cacheDir,
                {
                    recursive: true
                }
            );
        }

        /*
         * تحميل الصورة بواسطة curl
         * لأن Axios مع Imgur يرجع 429
         */

        await execFileAsync(
            "curl",
            [
                "-L",
                "--fail",
                "--silent",
                "--show-error",
                "--max-time",
                "20",
                "-A",
                "Mozilla/5.0",
                "-o",
                tempFile,
                imageUrl
            ],
            {
                timeout: 25000
            }
        );

        /*
         * التأكد من تحميل الصورة
         */

        if (
            !fs.existsSync(tempFile) ||
            fs.statSync(tempFile).size < 1000
        ) {
            throw new Error(
                "فشل تحميل صورة قائمة الأوامر"
            );
        }

        /*
         * إرسال الصورة مع القائمة
         */

        const msgg = {
            body: body,
            attachment: [
                fs.createReadStream(tempFile)
            ]
        };

        const sentMessage =
            await api.sendMessage(
                msgg,
                threadID,
                messageID
            );

        /*
         * حذف الملف المؤقت
         */

        setTimeout(() => {
            try {
                if (fs.existsSync(tempFile)) {
                    fs.unlinkSync(tempFile);
                }
            } catch (error) {
                console.error(
                    "[اوامر] Temp file:",
                    error.message
                );
            }
        }, 5000);

        /*
         * الحذف التلقائي
         */

        const configModule =
            global.configModule?.["اوامر"] || {};

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

    } catch (error) {
        /*
         * تنظيف الملف عند الخطأ
         */

        try {
            if (fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
            }
        } catch (cleanupError) {
            console.error(
                "[اوامر] Cleanup:",
                cleanupError.message
            );
        }

        console.error(
            "[اوامر] Image/Send Error:",
            error.message
        );

        /*
         * إرسال القائمة بدون صورة
         */

        try {
            const sentMessage =
                await api.sendMessage(
                    body,
                    threadID,
                    messageID
                );

            return sentMessage;

        } catch (sendError) {
            console.error(
                "[اوامر] Error:",
                sendError.message
            );

            return api.sendMessage(
                `حدث خطأ أثناء عرض الأوامر.
السبب: ${
                    sendError.message ||
                    error.message ||
                    "غير معروف"
                }`,
                threadID,
                messageID
            );
        }
    }
};
