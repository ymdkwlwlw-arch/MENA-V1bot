const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const vm = require("vm");

module.exports.config = {
    name: "adc",
    version: "3.0.0",
    hasPermssion: 2,
    credits: "KIROS",
    description: "إضافة أو تحديث أمر من رابط مع فحص وتحميل تلقائي",
    usePrefix: true,
    commandCategory: "Admin",
    usages: "adc اسم_الأمر + الرد على الرابط",
    cooldowns: 5
};

const COMMAND_DIR = __dirname;
const BACKUP_DIR = path.join(__dirname, "cache", "adc-backup");

const blockedPatterns = [
    /\bchild_process\b/i,
    /\bexec\s*\(/i,
    /\bexecFile\s*\(/i,
    /\bspawn\s*\(/i,
    /\bspawnSync\s*\(/i,
    /\bexecSync\s*\(/i,
    /\beval\s*\(/i,
    /\bFunction\s*\(/i,
    /\bprocess\.binding\b/i,
    /\bprocess\.dlopen\b/i,
    /\brm\s+-rf\b/i
];

function isSafeName(name) {
    return /^[a-zA-Z0-9_\u0600-\u06FF-]{1,50}$/.test(name);
}

function extractURL(text) {
    if (!text) return null;

    const match = text.match(
        /https?:\/\/[^\s<>"']+/i
    );

    return match ? match[0].replace(/[),.;]+$/, "") : null;
}

function checkCode(code) {
    if (!code || code.trim().length < 20) {
        return {
            ok: false,
            reason: "الكود فارغ أو قصير جدًا."
        };
    }

    for (const pattern of blockedPatterns) {
        if (pattern.test(code)) {
            return {
                ok: false,
                reason: `تم العثور على تعبير محظور: ${pattern}`
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
            reason: "الملف لا يبدو كأمر صالح للبوت."
        };
    }

    return {
        ok: true
    };
}

async function downloadCode(url) {
    const response = await axios.get(url, {
        timeout: 30000,
        responseType: "text",
        maxContentLength: 2 * 1024 * 1024,
        headers: {
            "User-Agent": "KIROS-BOT/3.0"
        }
    });

    if (typeof response.data !== "string") {
        throw new Error("الرابط لم يُرجع كود JavaScript نصيًا.");
    }

    return response.data;
}

async function loadCommand(filePath, commandName) {
    try {
        delete require.cache[
            require.resolve(filePath)
        ];

        const command = require(filePath);

        if (!command || typeof command !== "object") {
            throw new Error("الملف لا يحتوي على module صالح.");
        }

        if (
            !command.config ||
            !command.config.name
        ) {
            throw new Error(
                "ملف الأمر لا يحتوي على module.exports.config."
            );
        }

        if (
            typeof command.run !== "function"
        ) {
            throw new Error(
                "ملف الأمر لا يحتوي على module.exports.run."
            );
        }

        if (
            global.client &&
            global.client.commands
        ) {
            if (
                typeof global.client.commands.set ===
                "function"
            ) {
                global.client.commands.set(
                    command.config.name,
                    command
                );

                if (Array.isArray(command.config.aliases)) {
                    for (
                        const alias of command.config.aliases
                    ) {
                        global.client.commands.set(
                            alias,
                            command
                        );
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

    const commandName = args[0];

    const send = (text) =>
        api.sendMessage(
            text,
            threadID,
            messageID
        );

    if (!commandName) {
        return send(
            "╭─  ── ── ── ──  ─╮\n" +
            "     نـظـام تـحـديـث الأوامـر\n" +
            "╰─  ── ── ── ──  ─╯\n" +
            "⎔ الـطـريـقـة: adc اسم_الأمر\n" +
            "⊞ يـجـب الـرد عـلـى رسـالـة تـحـتـوي عـلـى رابـط\n" +
            "── ── ── ── ── ── ──"
        );
    }

    if (!isSafeName(commandName)) {
        return send(
            "اسم الأمر غير صالح.\n" +
            "استخدم اسمًا بسيطًا بدون مسارات أو رموز خاصة."
        );
    }

    const url = extractURL(
        messageReply?.body
    );

    if (!url) {
        return send(
            "╭─  ── ── ── ──  ─╮\n" +
            "     نـظـام تـحـديـث الأوامـر\n" +
            "╰─  ── ── ── ──  ─╯\n" +
            "⎔ الـحـالـة: لـم يـتـم الـعـثـور عـلـى رابـط\n" +
            "⊞ الـمـطـلـوب: الـرد عـلـى رسـالـة تـحـتـوي عـلـى الـرابـط\n" +
            "── ── ── ── ── ── ──"
        );
    }

    try {
        await api.setMessageReaction(
            "⏳",
            messageID,
            threadID
        );
    } catch (e) {}

    const filePath = path.join(
        COMMAND_DIR,
        `${commandName}.js`
    );

    const backupPath = path.join(
        BACKUP_DIR,
        `${commandName}_${Date.now()}.js`
    );

    try {
        await fs.ensureDir(BACKUP_DIR);

        const code = await downloadCode(url);

        const check = checkCode(code);

        if (!check.ok) {
            try {
                await api.setMessageReaction(
                    "❌",
                    messageID,
                    threadID
                );
            } catch (e) {}

            return send(
                "╭─  ── ── ── ──  ─╮\n" +
                "     نـظـام تـحـديـث الأوامـر\n" +
                "╰─  ── ── ── ──  ─╯\n" +
                "⎔ الـحـالـة: تـم رفـض الـكـود\n" +
                `⊞ الـسـبـب: ${check.reason}\n` +
                "── ── ── ── ── ── ──"
            );
        }

        if (fs.existsSync(filePath)) {
            await fs.copy(
                filePath,
                backupPath
            );
        }

        await fs.writeFile(
            filePath,
            code,
            "utf8"
        );

        const loaded = await loadCommand(
            filePath,
            commandName
        );

        if (!loaded.ok) {
            if (fs.existsSync(backupPath)) {
                await fs.copy(
                    backupPath,
                    filePath
                );

                delete require.cache[
                    require.resolve(filePath)
                ];
            }

            try {
                await api.setMessageReaction(
                    "❌",
                    messageID,
                    threadID
                );
            } catch (e) {}

            return send(
                "╭─  ── ── ── ──  ─╮\n" +
                "     نـظـام تـحـديـث الأوامـر\n" +
                "╰─  ── ── ── ──  ─╯\n" +
                "⎔ الـحـالـة: فـشـل تـحـمـيـل الـأمـر\n" +
                `⊞ الـسـبـب: ${loaded.reason}\n` +
                "⊞ تـمـت إعـادة الـنـسـخـة الـسـابـقـة\n" +
                "── ── ── ── ── ── ──"
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
            "╭─  ── ── ── ──  ─╮\n" +
            "     نـظـام تـحـديـث الأوامـر\n" +
            "╰─  ── ── ── ──  ─╯\n" +
            `⎔ الـأمـر: ${commandName}\n` +
            "⎔ الـحـالـة: تـم الـتـحـديـث بـنـجـاح\n" +
            "⊞ الـتـحـمـيـل: تـم تـلـقـائـيـًا\n" +
            "⊞ الـنـسـخـة الـسـابـقـة: تـم حـفـظـهـا\n" +
            "── ── ── ── ── ── ──"
        );

    } catch (error) {
        console.error(
            "[ADC]",
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
            "╭─  ── ── ── ──  ─╮\n" +
            "     نـظـام تـحـديـث الأوامـر\n" +
            "╰─  ── ── ── ──  ─╯\n" +
            "⎔ الـحـالـة: حـدث خـطـأ\n" +
            `⊞ الـسـبـب: ${error.message || "غير معروف"}\n` +
            "── ── ── ── ── ── ──"
        );
    }
};
