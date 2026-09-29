const fs = require("fs");
const path = require("path");

module.exports.config = {
    name: "مشرف",
    version: "3.0.0",
    hasPermssion: 2,
    credits: "KIROS",
    description: "إدارة مشرفي البوت",
    usePrefix: true,
    commandCategory: "الادمن",
    usages: "مشرف [قائمة/اضافة/حذف/فقط/بوكس]",
    cooldowns: 5
};

function getConfigPath() {
    return global.client.configPath;
}

function loadConfig() {
    const configPath = getConfigPath();

    delete require.cache[
        require.resolve(configPath)
    ];

    return require(configPath);
}

function saveConfig(config) {
    fs.writeFileSync(
        getConfigPath(),
        JSON.stringify(config, null, 4),
        "utf8"
    );
}

function getAdmins() {
    if (!Array.isArray(global.config.ADMINBOT)) {
        global.config.ADMINBOT = [];
    }

    return global.config.ADMINBOT;
}

async function getName(Users, id) {
    try {
        const data = await Users.getData(id);
        return data?.name || id;
    } catch (_) {
        return id;
    }
}

function getReplyID(event) {
    if (
        event.type === "message_reply" &&
        event.messageReply?.senderID
    ) {
        return String(
            event.messageReply.senderID
        );
    }

    return null;
}

module.exports.onLoad = function () {
    const cacheDir = path.join(
        __dirname,
        "cache"
    );

    const dataPath = path.join(
        cacheDir,
        "data.json"
    );

    try {
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, {
                recursive: true
            });
        }

        if (!fs.existsSync(dataPath)) {
            fs.writeFileSync(
                dataPath,
                JSON.stringify(
                    {
                        adminbox: {}
                    },
                    null,
                    4
                )
            );
        }
    } catch (error) {
        console.error(
            "[مشرف] Cache Error:",
            error
        );
    }
};

module.exports.run = async function ({
    api,
    event,
    args,
    Users,
    permssion
}) {
    const {
        threadID,
        messageID,
        senderID
    } = event;

    if (Number(permssion) < 2) {
        return api.sendMessage(
            "ليس لديك صلاحية استخدام هذا الأمر.",
            threadID,
            messageID
        );
    }

    const action = String(
        args[0] || "قائمة"
    ).toLowerCase();

    const config = loadConfig();
    const ADMINBOT = getAdmins();

    if (!Array.isArray(config.ADMINBOT)) {
        config.ADMINBOT = [];
    }

    /* =========================
       قائمة المشرفين
    ========================= */

    if (
        action === "قائمة" ||
        action === "list"
    ) {
        if (ADMINBOT.length === 0) {
            return api.sendMessage(
                "لا يوجد مشرفون للبوت حاليًا.",
                threadID,
                messageID
            );
        }

        const list = [];

        for (
            let i = 0;
            i < ADMINBOT.length;
            i++
        ) {
            const id = String(
                ADMINBOT[i]
            );

            const name =
                await getName(
                    Users,
                    id
                );

            list.push(
                `${i + 1}. ${name}\nID: ${id}`
            );
        }

        return api.sendMessage(
`╭─〔 مشرفو البوت 〕─╮
│
│ العدد: ${list.length}
│
${list.map(
    item => `│ ${item}`
).join("\n│\n")}
│
╰──────────────────╯`,
            threadID,
            messageID
        );
    }

    /* =========================
       إضافة مشرف
    ========================= */

    if (
        action === "اضافة" ||
        action === "إضافة" ||
        action === "add"
    ) {
        const targetID =
            getReplyID(event);

        if (!targetID) {
            return api.sendMessage(
                "يجب استخدام الأمر بالرد على رسالة الشخص.\n\nمثال: قم بالرد على رسالته ثم اكتب /مشرف اضافة",
                threadID,
                messageID
            );
        }

        if (
            ADMINBOT.some(
                id =>
                    String(id) ===
                    targetID
            )
        ) {
            return api.sendMessage(
                "هذا الشخص مشرف بالفعل.",
                threadID,
                messageID
            );
        }

        ADMINBOT.push(targetID);

        if (
            !config.ADMINBOT.some(
                id =>
                    String(id) ===
                    targetID
            )
        ) {
            config.ADMINBOT.push(
                targetID
            );
        }

        saveConfig(config);

        const name =
            await getName(
                Users,
                targetID
            );

        return api.sendMessage(
`تمت إضافة مشرف جديد.

الاسم: ${name}
ID: ${targetID}`,
            threadID,
            messageID
        );
    }

    /* =========================
       حذف مشرف
    ========================= */

    if (
        action === "حذف" ||
        action === "ازالة" ||
        action === "إزالة" ||
        action === "remove"
    ) {
        const targetID =
            getReplyID(event);

        if (!targetID) {
            return api.sendMessage(
                "يجب استخدام الأمر بالرد على رسالة المشرف.\n\nمثال: قم بالرد على رسالته ثم اكتب /مشرف حذف",
                threadID,
                messageID
            );
        }

        if (
            String(targetID) ===
            String(senderID)
        ) {
            return api.sendMessage(
                "لا يمكنك حذف نفسك من مشرفي البوت.",
                threadID,
                messageID
            );
        }

        const index =
            ADMINBOT.findIndex(
                id =>
                    String(id) ===
                    targetID
            );

        if (index === -1) {
            return api.sendMessage(
                "هذا الشخص ليس مشرفًا في البوت.",
                threadID,
                messageID
            );
        }

        ADMINBOT.splice(
            index,
            1
        );

        const configIndex =
            config.ADMINBOT.findIndex(
                id =>
                    String(id) ===
                    targetID
            );

        if (configIndex !== -1) {
            config.ADMINBOT.splice(
                configIndex,
                1
            );
        }

        saveConfig(config);

        const name =
            await getName(
                Users,
                targetID
            );

        return api.sendMessage(
`تم حذف المشرف.

الاسم: ${name}
ID: ${targetID}`,
            threadID,
            messageID
        );
    }

    /* =========================
       وضع الأدمن فقط
    ========================= */

    if (
        action === "فقط" ||
        action === "ادمن" ||
        action === "admin"
    ) {
        config.adminOnly =
            config.adminOnly !== true;

        saveConfig(config);

        return api.sendMessage(
            config.adminOnly
                ? "تم تفعيل وضع المشرفين فقط."
                : "تم إيقاف وضع المشرفين فقط.",
            threadID,
            messageID
        );
    }

    /* =========================
       وضع مشرفي المجموعة
    ========================= */

    if (
        action === "بوكس" ||
        action === "box" ||
        action === "boxonly"
    ) {
        const dataPath =
            path.join(
                __dirname,
                "cache",
                "data.json"
            );

        let database = {};

        try {
            database =
                JSON.parse(
                    fs.readFileSync(
                        dataPath,
                        "utf8"
                    )
                );
        } catch (_) {
            database = {};
        }

        if (
            !database.adminbox ||
            typeof database.adminbox !== "object"
        ) {
            database.adminbox = {};
        }

        const current =
            database.adminbox[
                threadID
            ] === true;

        database.adminbox[
            threadID
        ] = !current;

        fs.writeFileSync(
            dataPath,
            JSON.stringify(
                database,
                null,
                4
            )
        );

        return api.sendMessage(
            !current
                ? "تم تفعيل وضع مشرفي المجموعة."
                : "تم إيقاف وضع مشرفي المجموعة.",
            threadID,
            messageID
        );
    }

    /* =========================
       القائمة الرئيسية
    ========================= */

    return api.sendMessage(
`╭─〔 إدارة المشرفين 〕─╮
│
│ /مشرف قائمة
│ عرض مشرفي البوت
│
│ /مشرف اضافة
│ إضافة مشرف بالرد
│
│ /مشرف حذف
│ حذف مشرف بالرد
│
│ /مشرف فقط
│ تفعيل أو إيقاف وضع المشرفين
│
│ /مشرف بوكس
│ تفعيل أو إيقاف مشرفي المجموعة
│
╰────────────────────╯`,
        threadID,
        messageID
    );
};
