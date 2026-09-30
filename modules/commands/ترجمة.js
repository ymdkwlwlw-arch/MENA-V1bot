const axios = require("axios");

module.exports.config = {
    name: "ترجمة",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "KIROS",
    description: "ترجمة النص بالرد على رسالة",
    usePrefix: true,
    commandCategory: "خدمات",
    usages: "ترجمة [اللغة]",
    cooldowns: 3
};

const LANGUAGES = {
    ar: "العربية",
    en: "الإنجليزية",
    fr: "الفرنسية",
    de: "الألمانية",
    es: "الإسبانية",
    it: "الإيطالية",
    tr: "التركية",
    pt: "البرتغالية",
    ru: "الروسية",
    zh: "الصينية",
    ja: "اليابانية",
    ko: "الكورية",
    hi: "الهندية"
};

function detectLanguage(text) {
    if (/[\u0600-\u06FF]/.test(text)) return "ar";
    if (/[\u3040-\u30FF]/.test(text)) return "ja";
    if (/[\uAC00-\uD7AF]/.test(text)) return "ko";
    if (/[\u4E00-\u9FFF]/.test(text)) return "zh";
    return "en";
}

async function translate(text, target) {
    const source = detectLanguage(text);

    if (source === target) {
        return {
            translated: text,
            source,
            target
        };
    }

    const url =
        "https://translate.googleapis.com/translate_a/single";

    const response = await axios.get(url, {
        params: {
            client: "gtx",
            sl: source,
            tl: target,
            dt: "t",
            q: text
        },
        timeout: 15000
    });

    if (
        !response.data ||
        !Array.isArray(response.data[0])
    ) {
        throw new Error("لم يتم الحصول على نتيجة ترجمة.");
    }

    const translated = response.data[0]
        .map(item => item && item[0])
        .filter(Boolean)
        .join("");

    if (!translated) {
        throw new Error("النص المترجم فارغ.");
    }

    return {
        translated,
        source,
        target
    };
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

    const send = text =>
        api.sendMessage(
            text,
            threadID,
            messageID
        );

    if (!messageReply) {
        return send(
            "╭─  ── ── ── ──  ─╮\n" +
            "     نـظـام الـتـرجـمـة\n" +
            "╰─  ── ── ── ──  ─╯\n" +
            "⎔ الـطـريـقـة: رد عـلـى الـرسـالـة ثـم اكـتـب:\n" +
            "⊞ ترجمة\n" +
            "⊞ ترجمة en\n" +
            "⊞ ترجمة ar\n" +
            "── ── ── ── ── ── ──"
        );
    }

    const text =
        String(messageReply.body || "").trim();

    if (!text) {
        return send(
            "╭─  ── ── ── ──  ─╮\n" +
            "     نـظـام الـتـرجـمـة\n" +
            "╰─  ── ── ── ──  ─╯\n" +
            "⎔ الـحـالـة: لا يـوجـد نـص\n" +
            "⊞ الـرسـالـة الـمـردود عـلـيـهـا لا تـحـتـوي عـلـى نـص.\n" +
            "── ── ── ── ── ── ──"
        );
    }

    /*
     * الافتراضي: العربية
     */
    const target =
        String(args[0] || "ar")
            .toLowerCase();

    if (!LANGUAGES[target]) {
        return send(
            "╭─  ── ── ── ──  ─╮\n" +
            "     نـظـام الـتـرجـمـة\n" +
            "╰─  ── ── ── ──  ─╯\n" +
            "⎔ اللغة غير مدعومة.\n\n" +
            "⊞ المتاح:\n" +
            Object.entries(LANGUAGES)
                .map(
                    ([code, name]) =>
                        `⊸ ${code} — ${name}`
                )
                .join("\n") +
            "\n" +
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

    try {
        const result =
            await translate(
                text,
                target
            );

        try {
            await api.setMessageReaction(
                "✅",
                messageID,
                threadID
            );
        } catch (e) {}

        return send(
            "╭─  ── ── ── ──  ─╮\n" +
            "     نـظـام الـتـرجـمـة\n" +
            "╰─  ── ── ── ──  ─╯\n" +
            `⎔ الـلـغـة: ${LANGUAGES[result.source] || result.source}\n` +
            `⊞ الـتـرجـمـة إلـى: ${LANGUAGES[result.target] || result.target}\n\n` +
            `✦ ${result.translated}\n` +
            "── ── ── ── ── ── ──"
        );

    } catch (error) {

        console.error(
            "[ترجمة]",
            error.message
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
            "     نـظـام الـتـرجـمـة\n" +
            "╰─  ── ── ── ──  ─╯\n" +
            "⎔ الـحـالـة: فـشـل الـتـرجـمـة\n" +
            "⊞ تـأكـد مـن اتـصـال الـبـوت بـالإنـتـرنـت.\n" +
            `⊞ الـخـطـأ: ${error.message}\n` +
            "── ── ── ── ── ── ──"
        );
    }
};
