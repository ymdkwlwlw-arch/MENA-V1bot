module.exports.config = {
    name: "خطوط",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "KIROS",
    description: "تحويل النص إلى أشكال وخطوط مختلفة",
    usePrefix: true,
    commandCategory: "خدمات",
    usages: "خطوط [رقم] النص",
    cooldowns: 2
};

/* =====================================================
   الخطوط الإنجليزية
===================================================== */

const fonts = {
    1: {
        name: "Bold",
        convert: text =>
            text.replace(/[A-Za-z]/g, char => {
                const code =
                    char === char.toUpperCase()
                        ? 0x1D5A0
                        : 0x1D5BA;

                return String.fromCodePoint(
                    code + char.toUpperCase().charCodeAt(0) - 65
                );
            })
    },

    2: {
        name: "Italic",
        convert: text =>
            text.replace(/[A-Za-z]/g, char => {
                const upper =
                    char === char.toUpperCase();

                const base =
                    upper ? 0x1D434 : 0x1D44E;

                return String.fromCodePoint(
                    base + char.toUpperCase().charCodeAt(0) - 65
                );
            })
    },

    3: {
        name: "Monospace",
        convert: text =>
            text.replace(/[A-Za-z0-9]/g, char => {
                const code =
                    char.charCodeAt(0);

                if (code >= 65 && code <= 90) {
                    return String.fromCodePoint(
                        0x1D670 + code - 65
                    );
                }

                if (code >= 97 && code <= 122) {
                    return String.fromCodePoint(
                        0x1D68A + code - 97
                    );
                }

                if (code >= 48 && code <= 57) {
                    return String.fromCodePoint(
                        0x1D7F6 + code - 48
                    );
                }

                return char;
            })
    },

    4: {
        name: "Full Width",
        convert: text =>
            text.replace(/[A-Za-z0-9]/g, char => {
                const code =
                    char.charCodeAt(0);

                if (code >= 65 && code <= 90) {
                    return String.fromCharCode(
                        code + 0xFEE0
                    );
                }

                if (code >= 97 && code <= 122) {
                    return String.fromCharCode(
                        code + 0xFEE0
                    );
                }

                if (code >= 48 && code <= 57) {
                    return String.fromCharCode(
                        code + 0xFEE0
                    );
                }

                return char;
            })
    }
};

/* =====================================================
   زخارف جاهزة تعمل مع العربي والإنجليزي
===================================================== */

const styles = {
    5: text => `『 ${text} 』`,

    6: text => `【 ${text} 】`,

    7: text => `〘 ${text} 〙`,

    8: text => `꧁ ${text} ꧂`,

    9: text => `༺ ${text} ༻`,

    10: text => `◈ ${text} ◈`,

    11: text => `✦ ${text} ✦`,

    12: text => `『✧ ${text} ✧』`,

    13: text => `╭─ ${text} ─╮\n╰──────────╯`,

    14: text => `╰┈➤ ${text}`,

    15: text => `⊹ ${text} ⊹`
};

/* =====================================================
   القائمة
===================================================== */

function menu() {
    return (
        "╭─── ◸ نـظـام الـخـطـوط ◿ ───╮\n\n" +

        "⊸ 1 — Bold\n" +
        "⊸ 2 — Italic\n" +
        "⊸ 3 — Monospace\n" +
        "⊸ 4 — Full Width\n" +
        "⊸ 5 — 『 إطار 』\n" +
        "⊸ 6 — 【 إطار 】\n" +
        "⊸ 7 — 〘 إطار 〙\n" +
        "⊸ 8 — ꧁ زخرفة ꧂\n" +
        "⊸ 9 — ༺ زخرفة ༻\n" +
        "⊸ 10 — ◈ زخرفة ◈\n" +
        "⊸ 11 — ✦ زخرفة ✦\n" +
        "⊸ 12 — زخرفة ✧\n" +
        "⊸ 13 — إطار هندسي\n" +
        "⊸ 14 — سهم\n" +
        "⊸ 15 — زخرفة خفيفة\n\n" +

        "╰────────────────────────╯\n" +
        "⎔ الاستخدام:\n" +
        "⊞ خطوط 1 hello\n" +
        "⊞ خطوط 8 KIROS\n" +
        "⊞ خطوط 13 مرحباً"
    );
}

/* =====================================================
   التشغيل
===================================================== */

module.exports.run = async function ({
    api,
    event,
    args
}) {

    const {
        threadID,
        messageID
    } = event;

    const send = text =>
        api.sendMessage(
            text,
            threadID,
            messageID
        );

    if (!args.length) {
        return send(menu());
    }

    let styleNumber = 1;
    let text;

    /*
     * إذا أول كلمة رقم
     */
    if (
        /^\d+$/.test(args[0])
    ) {
        styleNumber =
            Number(args.shift());

        text =
            args.join(" ").trim();
    } else {
        text =
            args.join(" ").trim();
    }

    if (!text) {
        return send(
            "╭─── ◸ نـظـام الـخـطـوط ◿ ───╮\n" +
            "⎔ أدخل النص المراد تحويله.\n" +
            "⊞ مثال: خطوط 1 hello\n" +
            "╰────────────────────────╯"
        );
    }

    if (
        styleNumber < 1 ||
        styleNumber > 15
    ) {
        return send(
            "⎔ رقم الخط غير صحيح.\n" +
            "⊞ الأرقام المتاحة: 1 - 15"
        );
    }

    try {

        let result;

        if (fonts[styleNumber]) {
            result =
                fonts[styleNumber].convert(
                    text
                );
        } else {
            result =
                styles[styleNumber](text);
        }

        return send(
            "╭─── ◸ الـنـتـيـجـة ◿ ───╮\n" +
            `✦ ${result}\n` +
            "╰────────────────────╯"
        );

    } catch (error) {

        console.error(
            "[خطوط]",
            error
        );

        return send(
            "⎔ حدث خطأ أثناء تحويل النص."
        );
    }
};
