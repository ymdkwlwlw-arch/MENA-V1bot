const fs = require("fs");
const path = require("path");

module.exports.config = {
    name: "سيم",
    version: "3.0.0",
    hasPermssion: 0,
    credits: "KIROS",
    description: "نظام Sim للتعليم والردود التلقائية",
    usePrefix: false,
    commandCategory: "المحادثة",
    usages: "سيم on/off أو سيم الكلمة=>الرد",
    cooldowns: 2
};

const dataDir = path.join(__dirname, "cache", "DAN");
const dataPath = path.join(dataDir, "dan.json");
const statusPath = path.join(dataDir, "status.json");

function isAdmin(senderID) {
    const admins = Array.isArray(global.config.ADMINBOT)
        ? global.config.ADMINBOT
        : [];

    return admins.some(
        id => String(id) === String(senderID)
    );
}

function ensureFiles() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    if (!fs.existsSync(dataPath)) {
        fs.writeFileSync(
            dataPath,
            JSON.stringify({}, null, 4),
            "utf8"
        );
    }

    if (!fs.existsSync(statusPath)) {
        fs.writeFileSync(
            statusPath,
            JSON.stringify({
                enabled: false
            }, null, 4),
            "utf8"
        );
    }
}

function loadData() {
    ensureFiles();

    try {
        return JSON.parse(
            fs.readFileSync(dataPath, "utf8")
        );
    } catch {
        return {};
    }
}

function saveData(data) {
    fs.writeFileSync(
        dataPath,
        JSON.stringify(data, null, 4),
        "utf8"
    );
}

function getStatus() {
    ensureFiles();

    try {
        return JSON.parse(
            fs.readFileSync(statusPath, "utf8")
        );
    } catch {
        return { enabled: false };
    }
}

function setStatus(enabled) {
    fs.writeFileSync(
        statusPath,
        JSON.stringify({
            enabled
        }, null, 4),
        "utf8"
    );
}

module.exports.run = async function ({
    api,
    event,
    args
}) {
    const {
        threadID,
        messageID,
        senderID
    } = event;

    const content = args
        .join(" ")
        .trim();

    if (!content) {
        return api.sendMessage(
            "استخدم:\nسيم on\nسيم off\nسيم الكلمة=>الرد",
            threadID,
            messageID
        );
    }

    const lower = content.toLowerCase();

    /*
     * تشغيل Sim
     */

    if (lower === "on") {
        if (!isAdmin(senderID)) {
            return api.sendMessage(
                "هذه الوظيفة للمشرفين فقط.",
                threadID,
                messageID
            );
        }

        setStatus(true);

        return api.sendMessage(
            "تم تشغيل Sim.",
            threadID,
            messageID
        );
    }

    /*
     * إيقاف Sim
     */

    if (lower === "off") {
        if (!isAdmin(senderID)) {
            return api.sendMessage(
                "هذه الوظيفة للمشرفين فقط.",
                threadID,
                messageID
            );
        }

        setStatus(false);

        return api.sendMessage(
            "تم إيقاف Sim.",
            threadID,
            messageID
        );
    }

    /*
     * تعليم Sim
     *
     * مثال:
     * سيم السلام عليكم=>وعليكم السلام
     */

    if (content.includes("=>")) {
        if (!isAdmin(senderID)) {
            return api.sendMessage(
                "تعليم Sim متاح للمشرفين فقط.",
                threadID,
                messageID
            );
        }

        const parts = content.split("=>");

        const word = parts
            .shift()
            .trim();

        const response = parts
            .join("=>")
            .trim();

        if (!word || !response) {
            return api.sendMessage(
                "الصيغة الصحيحة:\nسيم الكلمة=>الرد",
                threadID,
                messageID
            );
        }

        const data = loadData();
        const key = word.toLowerCase();

        if (!Array.isArray(data[key])) {
            data[key] = [];
        }

        if (data[key].includes(response)) {
            return api.sendMessage(
                "هذا الرد موجود مسبقًا لهذه الكلمة.",
                threadID,
                messageID
            );
        }

        data[key].push(response);

        saveData(data);

        return api.sendMessage(
`تم تعليم Sim.

الكلمة: ${word}
الرد: ${response}`,
            threadID,
            messageID
        );
    }

    /*
     * البحث عن الرد
     */

    const status = getStatus();

    if (!status.enabled) {
        return;
    }

    const data = loadData();
    const key = content.toLowerCase();

    let responses = data[key];

    if (!Array.isArray(responses) || !responses.length) {
        return;
    }

    const randomIndex = Math.floor(
        Math.random() * responses.length
    );

    const response =
        responses[randomIndex];

    return api.sendMessage(
        response,
        threadID,
        messageID
    );
};
