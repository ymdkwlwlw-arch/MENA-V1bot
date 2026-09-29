module.exports.config = {
    name: "كمند",
    aliases: ["cmd"],
    version: "3.0.0",
    hasPermssion: 2,
    credits: "محمد إدريس",
    description: "إدارة وتحكم في أوامر البوت",
    usePrefix: true,
    commandCategory: "المطور",
    usages: "كمند load | unload | reload | reloadAll | info",
    cooldowns: 3
};

const fs = require("fs");
const path = require("path");

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

    const moduleName =
        args
            .slice(1)
            .join(" ")
            .trim();

    const commands =
        global.client.commands;

    if (!commands) {
        return send(
            "تعذر الوصول إلى نظام الأوامر."
        );
    }

    /*
     * مسار مجلد الأوامر الحالي
     */
    const commandsPath =
        path.resolve(__dirname);

    /*
     * منع الخروج من مجلد commands
     */
    function getCommandFile(name) {

        if (!name) {
            return null;
        }

        let cleanName =
            String(name).trim();

        /*
         * إزالة الامتداد إذا كتبه المستخدم
         */
        if (
            cleanName.endsWith(".js")
        ) {
            cleanName =
                cleanName.slice(
                    0,
                    -3
                );
        }

        /*
         * منع المسارات الخطرة
         */
        if (
            cleanName.includes("/") ||
            cleanName.includes("\\") ||
            cleanName.includes("..")
        ) {
            return null;
        }

        const filePath =
            path.resolve(
                commandsPath,
                `${cleanName}.js`
            );

        /*
         * تأكد أن الملف داخل مجلد commands
         */
        if (
            filePath !== commandsPath &&
            !filePath.startsWith(
                commandsPath + path.sep
            )
        ) {
            return null;
        }

        return filePath;
    }

    /*
     * العثور على الأمر سواء بالاسم
     * أو alias أو اسم الملف
     */
    function findLoadedCommand(name) {

        const wanted =
            String(name || "")
                .trim()
                .toLowerCase();

        if (!wanted) {
            return null;
        }

        /*
         * الاسم المباشر في Map
         */
        const direct =
            commands.get(wanted);

        if (direct) {
            return direct;
        }

        /*
         * البحث في config.name و aliases
         */
        for (
            const [
                key,
                command
            ] of commands.entries()
        ) {

            if (
                String(key)
                    .toLowerCase() === wanted
            ) {
                return command;
            }

            const config =
                command?.config || {};

            if (
                String(
                    config.name || ""
                ).toLowerCase() === wanted
            ) {
                return command;
            }

            const aliases =
                Array.isArray(
                    config.aliases
                )
                    ? config.aliases
                    : [];

            if (
                aliases.some(
                    alias =>
                        String(alias)
                            .toLowerCase() ===
                        wanted
                )
            ) {
                return command;
            }
        }

        return null;
    }

    /*
     * تحميل أمر من الملف
     */
    async function load(name) {

        if (!name) {
            return send(
                "حدد اسم الأمر.\n\n" +
                "مثال:\n" +
                "كمند load لينا"
            );
        }

        const commandPath =
            getCommandFile(name);

        if (!commandPath) {
            return send(
                "اسم الملف غير صالح."
            );
        }

        if (
            !fs.existsSync(
                commandPath
            )
        ) {
            return send(
                `ملف الأمر ${name} غير موجود.`
            );
        }

        try {

            /*
             * تنظيف الكاش
             */
            delete require.cache[
                require.resolve(
                    commandPath
                )
            ];

            const command =
                require(commandPath);

            /*
             * التحقق من بنية الأمر
             */
            if (
                !command ||
                !command.config ||
                !command.config.name ||
                typeof command.run !==
                    "function"
            ) {
                return send(
                    `تعذر تحميل ${name}.\n` +
                    `ملف الأمر غير صالح.`
                );
            }

            /*
             * تسجيل الاسم الأساسي
             */
            commands.set(
                command.config.name,
                command
            );

            /*
             * تسجيل aliases أيضًا
             */
            if (
                Array.isArray(
                    command.config.aliases
                )
            ) {

                for (
                    const alias
                    of command.config.aliases
                ) {

                    if (alias) {
                        commands.set(
                            alias,
                            command
                        );
                    }
                }
            }

            return send(
                `تم تحميل الأمر بنجاح.\n\n` +
                `الاسم: ${command.config.name}\n` +
                `الإصدار: ${
                    command.config.version ||
                    "غير محدد"
                }`
            );

        } catch (error) {

            console.error(
                "[كمند load]",
                error
            );

            return send(
                `فشل تحميل ${name}.\n\n` +
                `الخطأ:\n` +
                `${error.message || error}`
            );
        }
    }

    /*
     * إعادة تحميل أمر
     */
    async function reload(name) {

        if (!name) {
            return send(
                "حدد اسم الأمر.\n\n" +
                "مثال:\n" +
                "كمند reload لينا"
            );
        }

        const commandPath =
            getCommandFile(name);

        if (!commandPath) {
            return send(
                "اسم الأمر أو الملف غير صالح."
            );
        }

        if (
            !fs.existsSync(
                commandPath
            )
        ) {
            return send(
                `ملف الأمر ${name} غير موجود.`
            );
        }

        try {

            const oldCommand =
                findLoadedCommand(name);

            /*
             * إزالة الاسم القديم
             */
            if (oldCommand) {

                const oldConfig =
                    oldCommand.config || {};

                if (
                    oldConfig.name
                ) {
                    commands.delete(
                        oldConfig.name
                    );
                }

                if (
                    Array.isArray(
                        oldConfig.aliases
                    )
                ) {

                    for (
                        const alias
                        of oldConfig.aliases
                    ) {
                        commands.delete(
                            alias
                        );
                    }
                }
            }

            /*
             * تنظيف الكاش
             */
            delete require.cache[
                require.resolve(
                    commandPath
                )
            ];

            const command =
                require(commandPath);

            if (
                !command ||
                !command.config ||
                !command.config.name ||
                typeof command.run !==
                    "function"
            ) {
                return send(
                    `فشل إعادة تحميل ${name}.\n` +
                    `ملف الأمر غير صالح.`
                );
            }

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
                    const alias
                    of command.config.aliases
                ) {

                    if (alias) {
                        commands.set(
                            alias,
                            command
                        );
                    }
                }
            }

            return send(
                `تمت إعادة تحميل الأمر بنجاح.\n\n` +
                `الاسم: ${command.config.name}\n` +
                `الإصدار: ${
                    command.config.version ||
                    "غير محدد"
                }`
            );

        } catch (error) {

            console.error(
                "[كمند reload]",
                error
            );

            return send(
                `فشلت إعادة تحميل ${name}.\n\n` +
                `الخطأ:\n` +
                `${error.message || error}`
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

        if (
            name.toLowerCase() ===
            "كمند" ||
            name.toLowerCase() ===
            "cmd"
        ) {
            return send(
                "لا يمكن تعطيل أمر كمند من خلال نفسه."
            );
        }

        const command =
            findLoadedCommand(name);

        if (!command) {
            return send(
                `الأمر ${name} غير محمل حاليًا.`
            );
        }

        const config =
            command.config || {};

        /*
         * إزالة الاسم
         */
        if (config.name) {
            commands.delete(
                config.name
            );
        }

        /*
         * إزالة aliases
         */
        if (
            Array.isArray(
                config.aliases
            )
        ) {

            for (
                const alias
                of config.aliases
            ) {
                commands.delete(
                    alias
                );
            }
        }

        return send(
            `تم تعطيل الأمر ${
                config.name || name
            }.\n\n` +
            `لإعادته:\n` +
            `كمند load ${
                config.name || name
            }`
        );
    }

    /*
     * معلومات الأمر
     */
    async function info(name) {

        if (!name) {
            return send(
                "حدد اسم الأمر.\n\n" +
                "مثال:\n" +
                "كمند info لينا"
            );
        }

        const command =
            findLoadedCommand(name);

        if (!command) {
            return send(
                `الأمر ${name} غير موجود أو غير محمل.`
            );
        }

        const config =
            command.config || {};

        const dependencies =
            config.dependencies &&
            typeof config.dependencies ===
                "object"
                ? Object.keys(
                    config.dependencies
                )
                : [];

        const aliases =
            Array.isArray(
                config.aliases
            )
                ? config.aliases.join(", ")
                : "لا توجد";

        return send(
`╭──〔 معلومات الأمر 〕──╮
│
│ الاسم: ${
    config.name || name
}
│ الإصدار: ${
    config.version || "غير محدد"
}
│ المطور: ${
    config.credits || "غير محدد"
}
│ الصلاحية: ${
    config.hasPermssion ?? 0
}
│ الفئة: ${
    config.commandCategory || "غير محددة"
}
│ الانتظار: ${
    config.cooldowns || 0
} ثانية
│ aliases: ${aliases}
│ المكتبات: ${
    dependencies.join(", ") ||
    "لا توجد"
}
│
╰──────────────────`
        );
    }

    /*
     * إعادة تحميل جميع الأوامر
     */
    async function reloadAll() {

        try {

            const files =
                fs
                    .readdirSync(
                        commandsPath
                    )
                    .filter(
                        file =>
                            file.endsWith(
                                ".js"
                            ) &&
                            file !==
                                "كمند.js" &&
                            file !==
                                "cmd.js"
                    );

            let loaded = 0;
            let failed = 0;

            /*
             * تنظيف الأوامر القديمة
             *
             * مع الحفاظ على كمند
             */
            const currentCommands =
                [...commands.entries()];

            for (
                const [
                    key,
                    command
                ] of currentCommands
            ) {

                if (
                    command ===
                    module.exports
                ) {
                    continue;
                }

                commands.delete(
                    key
                );
            }

            for (
                const file
                of files
            ) {

                try {

                    const filePath =
                        path.join(
                            commandsPath,
                            file
                        );

                    delete require.cache[
                        require.resolve(
                            filePath
                        )
                    ];

                    const command =
                        require(filePath);

                    if (
                        !command ||
                        !command.config ||
                        !command.config.name ||
                        typeof command.run !==
                            "function"
                    ) {
                        failed++;
                        continue;
                    }

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
                            const alias
                            of command.config.aliases
                        ) {

                            if (alias) {
                                commands.set(
                                    alias,
                                    command
                                );
                            }
                        }
                    }

                    loaded++;

                } catch (error) {

                    failed++;

                    console.error(
                        `[كمند reloadAll] ${file}:`,
                        error.message
                    );
                }
            }

            return send(
`╭──〔 إعادة تحميل الأوامر 〕──╮
│
│ تم التحميل: ${loaded}
│ فشل: ${failed}
│
╰────────────────────`
            );

        } catch (error) {

            console.error(
                "[كمند reloadAll]",
                error
            );

            return send(
                `فشلت إعادة تحميل الأوامر.\n\n` +
                `الخطأ:\n` +
                `${error.message || error}`
            );
        }
    }

    /*
     * القائمة
     */
    if (!action) {

        return send(
`╭──〔 نظام كمند 〕──╮
│
│ كمند load اسم
│ كمند unload اسم
│ كمند reload اسم
│ كمند reloadAll
│ كمند info اسم
│
│ مثال:
│ كمند reload لينا
│
╰──────────────────`
        );
    }

    /*
     * تنفيذ العملية
     */
    switch (action) {

        case "load":
            return load(
                moduleName
            );

        case "unload":
            return unload(
                moduleName
            );

        case "reload":
            return reload(
                moduleName
            );

        case "reloadall":
        case "loadall":
            return reloadAll();

        case "info":
            return info(
                moduleName
            );

        default:
            return send(
`الأمر غير معروف.

الأوامر المتاحة:

كمند load اسم
كمند unload اسم
كمند reload اسم
كمند reloadAll
كمند info اسم`
            );
    }
};
