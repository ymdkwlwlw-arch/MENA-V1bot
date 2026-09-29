const moment = require("moment-timezone");

module.exports.config = {
    name: "مستخدم",
    aliases: ["user", "users"],
    version: "2.0.0",
    hasPermssion: 2,
    credits: "Mirai Team | KIROS",
    description: "إدارة حظر المستخدمين وحظر الأوامر",
    usePrefix: true,
    commandCategory: "Admin",
    usages: "مستخدم ban | unban | search | banCommand | unbanCommand | list | info",
    cooldowns: 5
};

function style(title, content = "") {
    return (
        "╭─  ── ── ── ──  ─╮\n" +
        `     ${title}\n` +
        "╰─  ── ── ── ──  ─╯\n" +
        content +
        "\n── ── ── ── ── ── ──"
    );
}

function isValidID(id) {
    return /^\d+$/.test(String(id || ""));
}

function getTargetFromEvent(event, args) {
    if (event.type === "message_reply" && event.messageReply?.senderID) {
        return String(event.messageReply.senderID);
    }

    const mentions = Object.keys(event.mentions || {});

    if (mentions.length > 0) {
        return String(mentions[0]);
    }

    if (args[1] && isValidID(args[1])) {
        return String(args[1]);
    }

    return null;
}

function getReason(args, startIndex = 2) {
    return args.slice(startIndex).join(" ").trim() || null;
}

function getUserName(id) {
    try {
        return global.data?.userName?.get(String(id)) || null;
    } catch {
        return null;
    }
}

async function resolveUserName(Users, id) {
    const cached = getUserName(id);
    if (cached) return cached;

    try {
        return await Users.getNameUser(String(id));
    } catch {
        return "مستخدم غير معروف";
    }
}

function removeReaction(messageID) {
    const index = global.client.handleReaction.findIndex(
        item => String(item.messageID) === String(messageID)
    );

    if (index !== -1) {
        global.client.handleReaction.splice(index, 1);
    }
}

function addReactionHandler(data) {
    if (!Array.isArray(global.client.handleReaction)) {
        global.client.handleReaction = [];
    }

    global.client.handleReaction.push(data);
}

function getCommandNames() {
    const names = [];

    for (const name of global.client.commands.keys()) {
        names.push(name);
    }

    return names;
}

module.exports.handleReaction = async function ({
    event,
    api,
    Users,
    handleReaction,
    getText
}) {
    if (
        String(event.userID) !==
        String(handleReaction.author)
    ) {
        return;
    }

    const {
        threadID,
        messageID,
        type,
        targetID,
        reason,
        commandNeedBan,
        nameTarget
    } = handleReaction;

    removeReaction(messageID);

    try {
        const time = moment
            .tz("Africa/Khartoum")
            .format("HH:mm:ss DD/MM/YYYY");

        if (type === "ban") {
            let data =
                (await Users.getData(String(targetID))).data || {};

            data.banned = true;
            data.reason = reason || null;
            data.dateAdded = time;

            await Users.setData(String(targetID), { data });

            if (!global.data.userBanned) {
                global.data.userBanned = new Map();
            }

            global.data.userBanned.set(String(targetID), {
                reason: data.reason,
                dateAdded: data.dateAdded
            });

            await api.sendMessage(
                style(
                    "نـظـام حـظـر الـمـسـتـخـدم",
                    `⎔ الـمـسـتـخـدم: ${nameTarget}\n` +
                    `⎔ الـمـعـرف: ${targetID}\n` +
                    `⊞ الـحـالـة: تـم الـحـظـر\n` +
                    `⊞ الـوقـت: ${time}`
                ),
                threadID
            );

            return;
        }

        if (type === "unban") {
            let data =
                (await Users.getData(String(targetID))).data || {};

            data.banned = false;
            data.reason = null;
            data.dateAdded = null;

            await Users.setData(String(targetID), { data });

            if (global.data.userBanned) {
                global.data.userBanned.delete(String(targetID));
            }

            return api.sendMessage(
                style(
                    "نـظـام فـك الـحـظـر",
                    `⎔ الـمـسـتـخـدم: ${nameTarget}\n` +
                    `⎔ الـمـعـرف: ${targetID}\n` +
                    `⊞ الـحـالـة: تـم فـك الـحـظـر`
                ),
                threadID
            );
        }

        if (type === "banCommand") {
            let data =
                (await Users.getData(String(targetID))).data || {};

            const oldCommands = Array.isArray(data.commandBanned)
                ? data.commandBanned
                : [];

            data.commandBanned = [
                ...new Set([
                    ...oldCommands,
                    ...commandNeedBan
                ])
            ];

            await Users.setData(String(targetID), { data });

            if (!global.data.commandBanned) {
                global.data.commandBanned = new Map();
            }

            global.data.commandBanned.set(
                String(targetID),
                data.commandBanned
            );

            return api.sendMessage(
                style(
                    "نـظـام حـظـر الأوامـر",
                    `⎔ الـمـسـتـخـدم: ${nameTarget}\n` +
                    `⎔ الـمـعـرف: ${targetID}\n` +
                    `⊞ الأوامـر: ${commandNeedBan.join(", ")}\n` +
                    `⊞ الـحـالـة: تـم الـتـطـبـيـق`
                ),
                threadID
            );
        }

        if (type === "unbanCommand") {
            let data =
                (await Users.getData(String(targetID))).data || {};

            const oldCommands = Array.isArray(data.commandBanned)
                ? data.commandBanned
                : [];

            data.commandBanned = oldCommands.filter(
                command => !commandNeedBan.includes(command)
            );

            await Users.setData(String(targetID), { data });

            if (global.data.commandBanned) {
                if (data.commandBanned.length > 0) {
                    global.data.commandBanned.set(
                        String(targetID),
                        data.commandBanned
                    );
                } else {
                    global.data.commandBanned.delete(
                        String(targetID)
                    );
                }
            }

            return api.sendMessage(
                style(
                    "نـظـام فـك حـظـر الأوامـر",
                    `⎔ الـمـسـتـخـدم: ${nameTarget}\n` +
                    `⎔ الـمـعـرف: ${targetID}\n` +
                    `⊞ الأوامـر: ${commandNeedBan.join(", ")}\n` +
                    `⊞ الـحـالـة: تـم الـتـطـبـيـق`
                ),
                threadID
            );
        }

    } catch (error) {
        console.error("[مستخدم] Reaction Error:", error);

        return api.sendMessage(
            `حدث خطأ أثناء تنفيذ العملية.\nالسبب: ${error.message || "غير معروف"}`,
            threadID
        );
    }
};

module.exports.run = async function ({
    event,
    api,
    args,
    Users
}) {
    const {
        threadID,
        messageID,
        senderID
    } = event;

    const subCommand =
        String(args[0] || "").toLowerCase();

    /*
     * القائمة الرئيسية
     */
    if (!subCommand) {
        return api.sendMessage(
            style(
                "نـظـام الـمـسـتـخـدم",
                "⎔ ban ID سبب\n" +
                "⎔ unban ID\n" +
                "⎔ search الاسم\n" +
                "⎔ banCommand ID الأمر\n" +
                "⎔ unbanCommand ID الأمر\n" +
                "⎔ list [العدد]\n" +
                "⎔ info ID\n" +
                "── ── ── ── ── ── ──\n" +
                "⊞ الـصـلاحـيـة: الـمـطـور"
            ),
            threadID,
            messageID
        );
    }

    /*
     * حظر مستخدم
     */
    if (
        subCommand === "ban" ||
        subCommand === "-b" ||
        subCommand === "حظر"
    ) {
        const targetID =
            getTargetFromEvent(event, args);

        const reason =
            event.type === "message_reply"
                ? getReason(args, 1)
                : getReason(args, 2);

        if (!targetID) {
            return api.sendMessage(
                "يجب تحديد ID المستخدم أو الرد على رسالته.",
                threadID,
                messageID
            );
        }

        if (
            !global.data.allUserID
                .map(String)
                .includes(String(targetID))
        ) {
            return api.sendMessage(
                "هذا المستخدم غير موجود في قاعدة بيانات البوت.",
                threadID,
                messageID
            );
        }

        if (
            global.data.userBanned &&
            global.data.userBanned.has(String(targetID))
        ) {
            const old =
                global.data.userBanned.get(String(targetID)) || {};

            return api.sendMessage(
                `المستخدم محظور بالفعل.\n\nID: ${targetID}\n` +
                `السبب: ${old.reason || "بدون سبب"}\n` +
                `التاريخ: ${old.dateAdded || "غير معروف"}`,
                threadID,
                messageID
            );
        }

        const nameTarget =
            await resolveUserName(Users, targetID);

        const confirmation = await api.sendMessage(
            style(
                "تـأكـيـد حـظـر مـسـتـخـدم",
                `⎔ الـمـسـتـخـدم: ${nameTarget}\n` +
                `⎔ الـمـعـرف: ${targetID}\n` +
                `⊞ الـسـبـب: ${reason || "بدون سبب"}\n\n` +
                "⏳ اضغط على التفاعل ⏳ لتأكيد العملية."
            ),
            threadID,
            messageID
        );

        if (!confirmation?.messageID) return;

        try {
            await api.setMessageReaction(
                "⏳",
                confirmation.messageID,
                () => {},
                true
            );
        } catch {}

        addReactionHandler({
            type: "ban",
            targetID,
            reason,
            nameTarget,
            messageID: confirmation.messageID,
            author: String(senderID)
        });

        return;
    }

    /*
     * فك الحظر
     */
    if (
        subCommand === "unban" ||
        subCommand === "-ub" ||
        subCommand === "فك"
    ) {
        const targetID =
            getTargetFromEvent(event, args);

        if (!targetID) {
            return api.sendMessage(
                "يجب تحديد ID المستخدم أو الرد على رسالته.",
                threadID,
                messageID
            );
        }

        if (
            !global.data.userBanned ||
            !global.data.userBanned.has(String(targetID))
        ) {
            return api.sendMessage(
                "هذا المستخدم غير محظور حالياً.",
                threadID,
                messageID
            );
        }

        const nameTarget =
            await resolveUserName(Users, targetID);

        const confirmation = await api.sendMessage(
            style(
                "تـأكـيـد فـك الـحـظـر",
                `⎔ الـمـسـتـخـدم: ${nameTarget}\n` +
                `⎔ الـمـعـرف: ${targetID}\n\n` +
                "⏳ اضغط على التفاعل ⏳ لتأكيد العملية."
            ),
            threadID,
            messageID
        );

        if (!confirmation?.messageID) return;

        try {
            await api.setMessageReaction(
                "⏳",
                confirmation.messageID,
                () => {},
                true
            );
        } catch {}

        addReactionHandler({
            type: "unban",
            targetID,
            nameTarget,
            messageID: confirmation.messageID,
            author: String(senderID)
        });

        return;
    }

    /*
     * البحث
     */
    if (
        subCommand === "search" ||
        subCommand === "-s" ||
        subCommand === "بحث"
    ) {
        const searchText =
            args.slice(1).join(" ").trim();

        if (!searchText) {
            return api.sendMessage(
                "اكتب اسم المستخدم الذي تريد البحث عنه.",
                threadID,
                messageID
            );
        }

        const users =
            await Users.getAll(["userID", "name"]);

        const results = users.filter(user =>
            user.name &&
            user.name
                .toLowerCase()
                .includes(searchText.toLowerCase())
        );

        if (!results.length) {
            return api.sendMessage(
                "لم يتم العثور على مستخدمين مطابقين.",
                threadID,
                messageID
            );
        }

        const list = results
            .slice(0, 30)
            .map(
                (user, index) =>
                    `${index + 1}. ${user.name} - ${user.userID}`
            )
            .join("\n");

        return api.sendMessage(
            style(
                "نـتـائـج الـبـحـث",
                `⎔ الـبـحـث: ${searchText}\n` +
                `⊞ الـنـتـائـج: ${results.length}\n\n` +
                list
            ),
            threadID,
            messageID
        );
    }

    /*
     * حظر أمر عن مستخدم
     */
    if (
        subCommand === "bancommand" ||
        subCommand === "-bc" ||
        subCommand === "حظرأمر"
    ) {
        const targetID =
            getTargetFromEvent(event, args);

        const commandText =
            event.type === "message_reply"
                ? args.slice(1).join(" ").trim()
                : args.slice(2).join(" ").trim();

        if (!targetID) {
            return api.sendMessage(
                "حدد ID المستخدم أو قم بالرد على رسالته.",
                threadID,
                messageID
            );
        }

        if (!commandText) {
            return api.sendMessage(
                "حدد الأمر أو الأوامر التي تريد حظرها.",
                threadID,
                messageID
            );
        }

        let commandNeedBan;

        if (commandText.toLowerCase() === "all") {
            commandNeedBan = getCommandNames();
        } else {
            commandNeedBan = commandText
                .split(/\s+/)
                .filter(Boolean);
        }

        const nameTarget =
            await resolveUserName(Users, targetID);

        const confirmation = await api.sendMessage(
            style(
                "تـأكـيـد حـظـر الأوامـر",
                `⎔ الـمـسـتـخـدم: ${nameTarget}\n` +
                `⎔ الـمـعـرف: ${targetID}\n` +
                `⊞ الأوامـر: ${commandNeedBan.join(", ")}\n\n` +
                "⏳ اضغط على التفاعل ⏳ لتأكيد العملية."
            ),
            threadID,
            messageID
        );

        if (!confirmation?.messageID) return;

        try {
            await api.setMessageReaction(
                "⏳",
                confirmation.messageID,
                () => {},
                true
            );
        } catch {}

        addReactionHandler({
            type: "banCommand",
            targetID,
            commandNeedBan,
            nameTarget,
            messageID: confirmation.messageID,
            author: String(senderID)
        });

        return;
    }

    /*
     * فك حظر الأوامر
     */
    if (
        subCommand === "unbancommand" ||
        subCommand === "-ubc" ||
        subCommand === "فكحظرأمر"
    ) {
        const targetID =
            getTargetFromEvent(event, args);

        if (!targetID) {
            return api.sendMessage(
                "حدد ID المستخدم أو قم بالرد على رسالته.",
                threadID,
                messageID
            );
        }

        if (
            !global.data.commandBanned ||
            !global.data.commandBanned.has(String(targetID))
        ) {
            return api.sendMessage(
                "لا توجد أوامر محظورة لهذا المستخدم.",
                threadID,
                messageID
            );
        }

        const currentCommands =
            global.data.commandBanned.get(String(targetID)) || [];

        const commandText =
            event.type === "message_reply"
                ? args.slice(1).join(" ").trim()
                : args.slice(2).join(" ").trim();

        let commandNeedBan;

        if (!commandText || commandText.toLowerCase() === "all") {
            commandNeedBan = [...currentCommands];
        } else {
            commandNeedBan = commandText
                .split(/\s+/)
                .filter(Boolean);
        }

        const nameTarget =
            await resolveUserName(Users, targetID);

        const confirmation = await api.sendMessage(
            style(
                "تـأكـيـد فـك حـظـر الأوامـر",
                `⎔ الـمـسـتـخـدم: ${nameTarget}\n` +
                `⎔ الـمـعـرف: ${targetID}\n` +
                `⊞ الأوامـر: ${commandNeedBan.join(", ")}\n\n` +
                "⏳ اضغط على التفاعل ⏳ لتأكيد العملية."
            ),
            threadID,
            messageID
        );

        if (!confirmation?.messageID) return;

        try {
            await api.setMessageReaction(
                "⏳",
                confirmation.messageID,
                () => {},
                true
            );
        } catch {}

        addReactionHandler({
            type: "unbanCommand",
            targetID,
            commandNeedBan,
            nameTarget,
            messageID: confirmation.messageID,
            author: String(senderID)
        });

        return;
    }

    /*
     * قائمة المحظورين
     */
    if (
        subCommand === "list" ||
        subCommand === "-l" ||
        subCommand === "قائمة"
    ) {
        const limit =
            Math.min(
                Math.max(
                    parseInt(args[1]) || 10,
                    1
                ),
                50
            );

        const bannedMap =
            global.data.userBanned || new Map();

        const bannedIDs =
            Array.from(bannedMap.keys());

        if (!bannedIDs.length) {
            return api.sendMessage(
                "لا يوجد مستخدمون محظورون حالياً.",
                threadID,
                messageID
            );
        }

        const lines = [];

        for (
            let i = 0;
            i < Math.min(limit, bannedIDs.length);
            i++
        ) {
            const id = String(bannedIDs[i]);
            const name = await resolveUserName(Users, id);

            lines.push(
                `${i + 1}. ${name} - ${id}`
            );
        }

        return api.sendMessage(
            style(
                "قـائـمـة الـمـحـظـوريـن",
                `⎔ إجـمـالـي الـمـحـظـوريـن: ${bannedIDs.length}\n` +
                `⊞ الـمـعـروض: ${lines.length}\n\n` +
                lines.join("\n")
            ),
            threadID,
            messageID
        );
    }

    /*
     * معلومات مستخدم
     */
    if (
        subCommand === "info" ||
        subCommand === "-i" ||
        subCommand === "معلومات"
    ) {
        const targetID =
            getTargetFromEvent(event, args);

        if (!targetID) {
            return api.sendMessage(
                "حدد ID المستخدم أو قم بالرد على رسالته.",
                threadID,
                messageID
            );
        }

        if (
            !global.data.allUserID
                .map(String)
                .includes(String(targetID))
        ) {
            return api.sendMessage(
                "هذا المستخدم غير موجود في قاعدة بيانات البوت.",
                threadID,
                messageID
            );
        }

        const nameTarget =
            await resolveUserName(Users, targetID);

        const userBan =
            global.data.userBanned?.get(String(targetID));

        const commandBan =
            global.data.commandBanned?.get(String(targetID)) || [];

        return api.sendMessage(
            style(
                "مـعـلـومـات الـمـسـتـخـدم",
                `⎔ الاسـم: ${nameTarget}\n` +
                `⎔ الـمـعـرف: ${targetID}\n` +
                `⊞ حـظـر الـمـسـتـخـدم: ${userBan ? "نعم" : "لا"}\n` +
                `⊞ سـبـب الـحـظـر: ${userBan?.reason || "لا يوجد"}\n` +
                `⊞ تـاريـخ الـحـظـر: ${userBan?.dateAdded || "لا يوجد"}\n` +
                `⊞ حـظـر الأوامـر: ${commandBan.length ? "نعم" : "لا"}\n` +
                `⊞ عـدد الأوامـر: ${commandBan.length}\n` +
                `⎔ الأوامـر: ${commandBan.length ? commandBan.join(", ") : "لا يوجد"}`
            ),
            threadID,
            messageID
        );
    }

    return api.sendMessage(
        "الأمر الفرعي غير معروف.\nاستخدم مستخدم لعرض قائمة الأوامر.",
        threadID,
        messageID
    );
};
