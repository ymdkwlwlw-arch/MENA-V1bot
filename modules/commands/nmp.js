const fs = require("fs-extra");
const path = require("path");
const { execFile } = require("child_process");

module.exports.config = {
    name: "npm",
    aliases: ["حزم", "مكتبات"],
    version: "1.0.0",
    hasPermssion: 2,
    credits: "KIROS",
    description: "إدارة مكتبات npm من داخل البوت",
    usePrefix: true,
    commandCategory: "system",
    usages: "npm تثبيت اسم-المكتبة",
    cooldowns: 10
};

const ROOT_DIR = path.resolve(__dirname, "../../");
const PACKAGE_JSON = path.join(
    ROOT_DIR,
    "package.json"
);

function runNpm(args) {
    return new Promise((resolve, reject) => {
        execFile(
            "npm",
            args,
            {
                cwd: ROOT_DIR,
                timeout: 180000,
                maxBuffer: 1024 * 1024 * 5,
                windowsHide: true
            },
            (error, stdout, stderr) => {
                if (error) {
                    error.stdout = stdout;
                    error.stderr = stderr;
                    return reject(error);
                }

                resolve({
                    stdout,
                    stderr
                });
            }
        );
    });
}

function validPackageName(name) {
    /*
     * يسمح بأسماء npm العادية مثل:
     * axios
     * fs-extra
     * @distube/ytdl-core
     * simple-youtube-api
     */

    return /^(@[a-z0-9._-]+\/)?[a-z0-9._-]+$/i.test(
        name
    );
}

function cleanOutput(text) {
    if (!text) return "";

    return String(text)
        .replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "")
        .trim();
}

function shortOutput(text, max = 1200) {
    text = cleanOutput(text);

    if (text.length <= max) {
        return text;
    }

    return text.slice(0, max) +
        "\n...\nتم اختصار الناتج.";
}

function getInstalledPackages() {
    if (!fs.existsSync(PACKAGE_JSON)) {
        return {};
    }

    try {
        const packageJSON =
            fs.readJsonSync(PACKAGE_JSON);

        return {
            ...(packageJSON.dependencies || {}),
            ...(packageJSON.devDependencies || {})
        };
    } catch {
        return {};
    }
}

module.exports.run = async function ({
    api,
    event,
    args
}) {
    const {
        threadID,
        messageID
    } = event;

    const send = message =>
        api.sendMessage(
            message,
            threadID,
            messageID
        );

    const action =
        String(args[0] || "")
            .trim()
            .toLowerCase();

    // ==============================
    // المساعدة
    // ==============================

    if (!action) {
        return send(
            "╭─  ── ── ── ──  ─╮\n" +
            "     نـظـام إدارة مـكـتـبـات NPM\n" +
            "╰─  ── ── ── ──  ─╯\n" +
            "⎔ npm تثبيت اسم_المكتبة\n" +
            "⎔ npm حذف اسم_المكتبة\n" +
            "⎔ npm تحديث اسم_المكتبة\n" +
            "⎔ npm معلومات اسم_المكتبة\n" +
            "⎔ npm قائمة\n" +
            "⎔ npm إصدار\n" +
            "⊞ الصلاحية: المطور فقط\n" +
            "── ── ── ── ── ── ──"
        );
    }

    // ==============================
    // عرض الإصدار
    // ==============================

    if (
        action === "إصدار" ||
        action === "version"
    ) {
        try {
            const result =
                await runNpm([
                    "--version"
                ]);

            return send(
                "╭─  ── ── ── ──  ─╮\n" +
                "     نـظـام NPM\n" +
                "╰─  ── ── ── ──  ─╯\n" +
                `⎔ إصدار NPM: ${cleanOutput(result.stdout)}\n` +
                "⊞ الحالة: يعمل\n" +
                "── ── ── ── ── ── ──"
            );

        } catch (error) {
            return send(
                `تعذر معرفة إصدار NPM.\nالسبب: ${error.message}`
            );
        }
    }

    // ==============================
    // قائمة المكتبات
    // ==============================

    if (
        action === "قائمة" ||
        action === "list" ||
        action === "ls"
    ) {
        try {
            const packages =
                getInstalledPackages();

            const names =
                Object.keys(packages);

            if (!names.length) {
                return send(
                    "لا توجد مكتبات مسجلة في package.json."
                );
            }

            const max =
                80;

            const list =
                names
                    .slice(0, max)
                    .map(
                        name =>
                            `⎔ ${name} — ${packages[name]}`
                    )
                    .join("\n");

            return send(
                "╭─  ── ── ── ──  ─╮\n" +
                "     مـكـتـبـات الـمـشـروع\n" +
                "╰─  ── ── ── ──  ─╯\n" +
                list +
                `\n\n⊞ الإجمالي: ${names.length}\n` +
                "── ── ── ── ── ── ──"
            );

        } catch (error) {
            return send(
                `تعذر قراءة package.json.\nالسبب: ${error.message}`
            );
        }
    }

    // ==============================
    // التحقق من اسم المكتبة
    // ==============================

    const packages =
        args
            .slice(1)
            .map(x => String(x).trim())
            .filter(Boolean);

    // ==============================
    // تثبيت
    // ==============================

    if (
        action === "تثبيت" ||
        action === "install" ||
        action === "i"
    ) {
        if (!packages.length) {
            return send(
                "اكتب اسم المكتبة التي تريد تثبيتها."
            );
        }

        const invalid =
            packages.filter(
                name =>
                    !validPackageName(name)
            );

        if (invalid.length) {
            return send(
                "اسم مكتبة غير صالح:\n\n" +
                invalid.join("\n")
            );
        }

        await api.setMessageReaction(
            "⏳",
            messageID,
            () => {},
            true
        );

        try {
            const result =
                await runNpm([
                    "install",
                    ...packages
                ]);

            await api.setMessageReaction(
                "✅",
                messageID,
                () => {},
                true
            );

            return send(
                "╭─  ── ── ── ──  ─╮\n" +
                "     نـظـام NPM\n" +
                "╰─  ── ── ── ──  ─╯\n" +
                "⎔ الحالة: تم تثبيت المكتبات بنجاح\n" +
                `⊞ المكتبات: ${packages.join(", ")}\n` +
                "── ── ── ── ── ── ──\n\n" +
                shortOutput(
                    result.stdout ||
                    result.stderr ||
                    "تم التثبيت."
                )
            );

        } catch (error) {
            await api.setMessageReaction(
                "❌",
                messageID,
                () => {},
                true
            );

            return send(
                "فشل تثبيت المكتبة.\n\n" +
                shortOutput(
                    error.stderr ||
                    error.stdout ||
                    error.message
                )
            );
        }
    }

    // ==============================
    // حذف مكتبة
    // ==============================

    if (
        action === "حذف" ||
        action === "remove" ||
        action === "uninstall"
    ) {
        if (!packages.length) {
            return send(
                "اكتب اسم المكتبة التي تريد حذفها."
            );
        }

        const invalid =
            packages.filter(
                name =>
                    !validPackageName(name)
            );

        if (invalid.length) {
            return send(
                "اسم مكتبة غير صالح."
            );
        }

        await api.setMessageReaction(
            "⏳",
            messageID,
            () => {},
            true
        );

        try {
            const result =
                await runNpm([
                    "uninstall",
                    ...packages
                ]);

            await api.setMessageReaction(
                "✅",
                messageID,
                () => {},
                true
            );

            return send(
                "╭─  ── ── ── ──  ─╮\n" +
                "     نـظـام NPM\n" +
                "╰─  ── ── ── ──  ─╯\n" +
                "⎔ الحالة: تم حذف المكتبة\n" +
                `⊞ المكتبات: ${packages.join(", ")}\n` +
                "── ── ── ── ── ── ──\n\n" +
                shortOutput(
                    result.stdout ||
                    "تم الحذف."
                )
            );

        } catch (error) {
            await api.setMessageReaction(
                "❌",
                messageID,
                () => {},
                true
            );

            return send(
                "فشل حذف المكتبة.\n\n" +
                shortOutput(
                    error.stderr ||
                    error.stdout ||
                    error.message
                )
            );
        }
    }

    // ==============================
    // تحديث
    // ==============================

    if (
        action === "تحديث" ||
        action === "update"
    ) {
        if (!packages.length) {
            return send(
                "اكتب اسم المكتبة التي تريد تحديثها."
            );
        }

        const invalid =
            packages.filter(
                name =>
                    !validPackageName(name)
            );

        if (invalid.length) {
            return send(
                "اسم مكتبة غير صالح."
            );
        }

        await api.setMessageReaction(
            "⏳",
            messageID,
            () => {},
            true
        );

        try {
            const result =
                await runNpm([
                    "update",
                    ...packages
                ]);

            await api.setMessageReaction(
                "✅",
                messageID,
                () => {},
                true
            );

            return send(
                "╭─  ── ── ── ──  ─╮\n" +
                "     نـظـام NPM\n" +
                "╰─  ── ── ── ──  ─╯\n" +
                "⎔ الحالة: تم تحديث المكتبة\n" +
                `⊞ المكتبات: ${packages.join(", ")}\n` +
                "── ── ── ── ── ── ──\n\n" +
                shortOutput(
                    result.stdout ||
                    "تم التحديث."
                )
            );

        } catch (error) {
            await api.setMessageReaction(
                "❌",
                messageID,
                () => {},
                true
            );

            return send(
                "فشل تحديث المكتبة.\n\n" +
                shortOutput(
                    error.stderr ||
                    error.stdout ||
                    error.message
                )
            );
        }
    }

    // ==============================
    // معلومات مكتبة
    // ==============================

    if (
        action === "معلومات" ||
        action === "info"
    ) {
        const packageName =
            packages[0];

        if (!packageName) {
            return send(
                "اكتب اسم المكتبة."
            );
        }

        if (
            !validPackageName(
                packageName
            )
        ) {
            return send(
                "اسم المكتبة غير صالح."
            );
        }

        await api.setMessageReaction(
            "⏳",
            messageID,
            () => {},
            true
        );

        try {
            const result =
                await runNpm([
                    "view",
                    packageName,
                    "name",
                    "version",
                    "description",
                    "license",
                    "--json"
                ]);

            await api.setMessageReaction(
                "✅",
                messageID,
                () => {},
                true
            );

            let info;

            try {
                info =
                    JSON.parse(
                        result.stdout
                    );
            } catch {
                info = {
                    name: packageName,
                    version: "غير معروف",
                    description:
                        cleanOutput(
                            result.stdout
                        )
                };
            }

            return send(
                "╭─  ── ── ── ──  ─╮\n" +
                "     مـعـلـومـات الـمـكـتـبـة\n" +
                "╰─  ── ── ── ──  ─╯\n" +
                `⎔ الاسم: ${info.name || packageName}\n` +
                `⎔ الإصدار: ${info.version || "غير معروف"}\n` +
                `⎔ الترخيص: ${info.license || "غير معروف"}\n` +
                `⊞ الوصف: ${info.description || "غير متوفر"}\n` +
                "── ── ── ── ── ── ──"
            );

        } catch (error) {
            await api.setMessageReaction(
                "❌",
                messageID,
                () => {},
                true
            );

            return send(
                "تعذر الحصول على معلومات المكتبة.\n\n" +
                shortOutput(
                    error.stderr ||
                    error.stdout ||
                    error.message
                )
            );
        }
    }

    return send(
        "الأمر غير معروف.\n\n" +
        "استخدم npm لعرض قائمة الأوامر."
    );
};
