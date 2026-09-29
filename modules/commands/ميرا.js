const { GoogleGenAI } = require("@google/genai");
const axios = require("axios");

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

/*
 * ذاكرة المحادثات:
 * كل Thread له conversation مستقلة.
 *
 * {
 *   threadID: {
 *      interactionId: "...",
 *      lastUsed: 123456789
 *   }
 * }
 */

const conversations = new Map();

const MAX_TEXT = 12000;
const MAX_CONTEXT_AGE = 1000 * 60 * 60 * 12; // 12 ساعة

const SYSTEM_INSTRUCTION = `
أنت ميرا، مساعد ذكاء اصطناعي داخل بوت ماسنجر.

تحدث مع المستخدم بشكل طبيعي ومباشر.
افهم العربية واللهجات العربية والإنجليزية واللغات الأخرى.
إذا طلب المستخدم ترجمة، ترجم مباشرة.
إذا أرسل صورة أو ملفاً أو صوتاً أو فيديو، حلله حسب محتواه.
إذا أرسل رابطاً، حاول فهم محتواه قبل الإجابة.
إذا كان السؤال متعلقاً بالرسائل السابقة، استخدم سياق المحادثة.

قواعد الأسلوب:
- لا تستخدم زخارف أو إطارات في الرد.
- لا تستخدم الإيموجي في نهاية كل جملة.
- استخدم النص الطبيعي.
- يمكن استخدام ヾ(＾-＾)ノ أحياناً عندما يناسب السياق، وليس في نهاية كل جملة.
- لا تكرر السؤال على المستخدم إذا كان المطلوب واضحاً.
- إذا لم تعرف معلومة، قل بوضوح إنك غير متأكد.
- لا تدّعي أنك شاهدت محتوى لم يتم إرساله إليك.
- اجعل الرد مناسباً للرسائل القصيرة في ماسنجر.
`;

function cleanText(text) {
    if (!text) return "";
    return String(text).trim().slice(0, MAX_TEXT);
}

function getThreadState(threadID) {
    const now = Date.now();
    const state = conversations.get(threadID);

    if (!state) return null;

    if (now - state.lastUsed > MAX_CONTEXT_AGE) {
        conversations.delete(threadID);
        return null;
    }

    return state;
}

function setThreadState(threadID, interactionId) {
    conversations.set(threadID, {
        interactionId,
        lastUsed: Date.now()
    });
}

function resetThread(threadID) {
    conversations.delete(threadID);
}

function splitMessage(text, max = 1800) {
    const result = [];

    if (!text) return result;

    let current = "";

    for (const line of String(text).split("\n")) {
        if ((current + "\n" + line).length <= max) {
            current += (current ? "\n" : "") + line;
            continue;
        }

        if (current) {
            result.push(current);
            current = "";
        }

        if (line.length <= max) {
            current = line;
            continue;
        }

        for (let i = 0; i < line.length; i += max) {
            result.push(line.slice(i, i + max));
        }
    }

    if (current) result.push(current);

    return result;
}

function extractUrls(text) {
    if (!text) return [];

    const matches = String(text).match(
        /https?:\/\/[^\s<>"']+/gi
    );

    return matches || [];
}

async function readWebPage(url) {
    try {
        const response = await axios.get(url, {
            timeout: 15000,
            maxContentLength: 5 * 1024 * 1024,
            maxBodyLength: 5 * 1024 * 1024,
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (compatible; MIRA-BOT/1.0)"
            }
        });

        const contentType =
            response.headers["content-type"] || "";

        if (!contentType.includes("text/html")) {
            return null;
        }

        let html = String(response.data);

        html = html
            .replace(/<script[\s\S]*?<\/script>/gi, " ")
            .replace(/<style[\s\S]*?<\/style>/gi, " ")
            .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
            .replace(/<svg[\s\S]*?<\/svg>/gi, " ");

        const text = html
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/gi, " ")
            .replace(/&amp;/gi, "&")
            .replace(/&quot;/gi, '"')
            .replace(/&#39;/gi, "'")
            .replace(/\s+/g, " ")
            .trim();

        return text.slice(0, 30000);

    } catch (error) {
        console.log(
            "[MIRA] فشل قراءة الرابط:",
            error.message
        );

        return null;
    }
}

function getAttachmentList(event) {
    const result = [];

    if (Array.isArray(event.attachments)) {
        result.push(...event.attachments);
    }

    if (
        event.messageReply &&
        Array.isArray(event.messageReply.attachments)
    ) {
        result.push(...event.messageReply.attachments);
    }

    return result;
}

function attachmentToInput(attachment) {
    if (!attachment) return null;

    const type = String(
        attachment.type ||
        attachment.mimeType ||
        attachment.mime_type ||
        ""
    ).toLowerCase();

    const url =
        attachment.url ||
        attachment.largePreviewUrl ||
        attachment.previewUrl;

    if (!url) return null;

    if (
        type.includes("photo") ||
        type.includes("image")
    ) {
        return {
            type: "image",
            uri: url,
            mime_type:
                attachment.mimeType ||
                attachment.mime_type ||
                "image/jpeg"
        };
    }

    if (
        type.includes("audio") ||
        type.includes("voice")
    ) {
        return {
            type: "audio",
            uri: url,
            mime_type:
                attachment.mimeType ||
                attachment.mime_type ||
                "audio/mpeg"
        };
    }

    if (
        type.includes("video")
    ) {
        return {
            type: "video",
            uri: url,
            mime_type:
                attachment.mimeType ||
                attachment.mime_type ||
                "video/mp4"
        };
    }

    if (
        type.includes("file") ||
        type.includes("document") ||
        type.includes("pdf")
    ) {
        return {
            type: "document",
            uri: url,
            mime_type:
                attachment.mimeType ||
                attachment.mime_type ||
                "application/octet-stream"
        };
    }

    return null;
}

function getOutputText(interaction) {
    if (!interaction) return "";

    if (typeof interaction.output_text === "string") {
        return interaction.output_text.trim();
    }

    if (typeof interaction.outputText === "string") {
        return interaction.outputText.trim();
    }

    return "";
}

async function createInteraction(input, previousInteractionId = null) {
    const config = {
        model: MODEL,
        input,
        system_instruction: SYSTEM_INSTRUCTION,
        generation_config: {
            temperature: 0.7,
            max_output_tokens: 4096
        }
    };

    if (previousInteractionId) {
        config.previous_interaction_id =
            previousInteractionId;
    }

    return ai.interactions.create(config);
}

async function askMira({
    threadID,
    text,
    attachments
}) {
    let prompt = cleanText(text);

    if (!prompt) {
        prompt = "حلل المحتوى المرفق وأخبرني بما تراه أو تفهمه منه.";
    }

    const urls = extractUrls(prompt);

    /*
     * نحاول قراءة صفحات الويب البسيطة بأنفسنا.
     * بعدها نرسل المحتوى إلى Gemini مع السؤال.
     */
    let pageContext = "";

    if (urls.length) {
        const pages = [];

        for (const url of urls.slice(0, 3)) {
            const page = await readWebPage(url);

            if (page) {
                pages.push(
                    `محتوى الرابط:\n${url}\n${page}`
                );
            }
        }

        if (pages.length) {
            pageContext =
                "\n\n--- محتوى الروابط ---\n" +
                pages.join("\n\n") +
                "\n--- نهاية محتوى الروابط ---\n";
        }
    }

    const inputs = [];

    inputs.push({
        type: "text",
        text:
            prompt +
            pageContext
    });

    /*
     * المرفقات
     */
    for (const attachment of attachments || []) {
        const input =
            attachmentToInput(attachment);

        if (input) {
            inputs.push(input);
        }
    }

    const previous =
        getThreadState(threadID);

    const interaction =
        await createInteraction(
            inputs,
            previous?.interactionId || null
        );

    const answer =
        getOutputText(interaction);

    if (!answer) {
        throw new Error(
            "Gemini returned an empty response"
        );
    }

    if (interaction.id) {
        setThreadState(
            threadID,
            interaction.id
        );
    }

    return answer;
}

module.exports.config = {
    name: "ميرا",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "محمد إدريس",
    description:
        "مساعد Gemini متعدد الوسائط مع ذاكرة محادثة",
    commandCategory: "عام",
    usages:
        "ميرا سؤالك أو أرسل صورة/ملف/رابط مع ميرا",
    cooldowns: 5
};

module.exports.run = async function ({
    api,
    event
}) {
    const threadID = event.threadID;

    if (!process.env.GEMINI_API_KEY) {
        return api.sendMessage(
            "مفتاح Gemini غير مضبوط في متغيرات البيئة.",
            threadID
        );
    }

    const body =
        cleanText(event.body || "");

    /*
     * حذف بادئة الأمر من بداية الرسالة
     */
    let prompt = body
        .replace(/^ميرا\b/i, "")
        .trim();

    /*
     * إعادة ضبط الذاكرة
     */
    if (
        /^(ميرا\s+)?(مسح|نسي|إعادة\s*تعيين|reset)$/i
            .test(body)
    ) {
        resetThread(threadID);

        return api.sendMessage(
            "تم مسح سياق ميرا لهذه المحادثة.",
            threadID
        );
    }

    /*
     * إظهار حالة النظام
     */
    if (
        /^(ميرا\s+)?(حالة|status)$/i
            .test(body)
    ) {
        const state =
            getThreadState(threadID);

        return api.sendMessage(
            `ميرا تعمل\nالنموذج: ${MODEL}\nالسياق: ${state ? "مستمر" : "جديد"}`,
            threadID
        );
    }

    const attachments =
        getAttachmentList(event);

    /*
     * لو الرسالة لا تحتوي شيئاً
     */
    if (
        !prompt &&
        attachments.length === 0
    ) {
        return api.sendMessage(
            "اكتب سؤالك أو أرسل صورة أو ملفاً أو رابطاً مع ميرا.",
            threadID
        );
    }

    try {
        await api.sendMessage(
            "ميرا تعالج الطلب ⏳",
            threadID
        );

        const answer =
            await askMira({
                threadID,
                text: prompt,
                attachments
            });

        const messages =
            splitMessage(answer);

        for (const message of messages) {
            await api.sendMessage(
                message,
                threadID
            );
        }

    } catch (error) {
        console.error(
            "[MIRA ERROR]",
            error
        );

        let message =
            "حصل خطأ أثناء معالجة الطلب.";

        const errorText =
            String(error?.message || "");

        if (
            /api.?key|authentication|unauthorized/i
                .test(errorText)
        ) {
            message =
                "تعذر الاتصال بـ Gemini. راجع GEMINI_API_KEY في متغيرات Render.";
        } else if (
            /quota|rate.?limit|resource.?exhausted/i
                .test(errorText)
        ) {
            message =
                "تم الوصول إلى حد الاستخدام الحالي لـ Gemini. حاول لاحقاً.";
        } else if (
            /previous_interaction/i
                .test(errorText)
        ) {
            resetThread(threadID);

            message =
                "انتهى سياق المحادثة السابق. أرسل طلبك مرة أخرى لبدء سياق جديد.";
        }

        return api.sendMessage(
            message,
            threadID
        );
    }
};
