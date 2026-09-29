const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const { GoogleGenAI } = require("@google/genai");

module.exports.config = {
    name: "ميرا",
    aliases: ["mira", "ميراai"],
    version: "1.2.0",
    hasPermssion: 0,
    credits: "KIROS",
    description: "ميرا — محللة ذكية للنصوص والصور والروابط والملفات",
    usePrefix: false,
    commandCategory: "الذكاء الاصطناعي",
    usages: "ميرا [سؤالك] أو بالرد على صورة/ملف",
    cooldowns: 3
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.MIRA_MODEL || "gemini-3.8-flash";

const CACHE_DIR = path.join(__dirname, "cache", "mira");

const MAX_HISTORY = 10;
const MAX_FILE_SIZE = 25 * 1024 * 1024;

const MIRA_SYSTEM = `
أنتِ ميرا، مساعدة ذكاء اصطناعي متعددة الوسائط داخل بوت Messenger.

وظيفتك:
- تحليل النصوص.
- تحليل الصور.
- استخراج النصوص والمعلومات من الصور.
- تحليل الروابط وصفحات الويب المتاحة.
- تحليل الملفات المدعومة.
- تلخيص المحتوى.
- استخراج البيانات والجداول.
- مقارنة المعلومات.
- شرح المحتوى بطريقة واضحة.

القواعد:
- استخدمي العربية الواضحة ويمكن استخدام اللهجة السودانية عند الحاجة.
- لا تختلقي معلومات.
- إذا لم تتمكني من الوصول إلى رابط أو ملف، اذكري ذلك بوضوح.
- ميزي بين المعلومات المؤكدة والتخمين.
- إذا كانت الصورة غير واضحة، اذكري أن النتيجة غير مؤكدة.
- عند وجود رابط، اعتمدي على المحتوى الذي تم الوصول إليه فعليًا.
- لا تكشفي API keys أو كلمات المرور أو AppState أو session cookies.
- لا تنفذي Shell أو JavaScript يرسله المستخدم.
- لا تدّعي تنفيذ عملية خارجية لم يتم تنفيذها.
`;

const conversations = new Map();

function getKey(threadID, senderID) {
    return `${threadID}:${senderID}`;
}

function getConversation(threadID, senderID) {
    const key = getKey(threadID, senderID);

    if (!conversations.has(key)) {
        conversations.set(key, {
            messages: [],
            lastActivity: Date.now()
        });
    }

    const conversation = conversations.get(key);

    conversation.lastActivity = Date.now();

    return conversation;
}

function addHistory(threadID, senderID, role, content) {
    const conversation = getConversation(
        threadID,
        senderID
    );

    conversation.messages.push({
        role,
        content: String(content)
    });

    if (conversation.messages.length > MAX_HISTORY) {
        conversation.messages =
            conversation.messages.slice(-MAX_HISTORY);
    }
}

setInterval(() => {
    const now = Date.now();

    for (const [key, value] of conversations) {
        if (
            now - value.lastActivity >
            60 * 60 * 1000
        ) {
            conversations.delete(key);
        }
    }
}, 10 * 60 * 1000);


/* =========================
   REACTION
========================= */

async function reaction(api, messageID, emoji) {
    try {
        if (
            typeof api.setMessageReaction ===
            "function"
        ) {
            await api.setMessageReaction(
                emoji,
                messageID,
                () => {},
                true
            );
        }
    } catch (_) {}
}


/* =========================
   TYPING
========================= */

async function typing(api, threadID, state) {
    try {
        if (
            typeof api.sendTypingIndicator ===
            "function"
        ) {
            return await api.sendTypingIndicator(
                threadID,
                state
            );
        }

        if (
            typeof api.sendTyping ===
            "function"
        ) {
            return await api.sendTyping(
                threadID,
                state
            );
        }
    } catch (_) {}
}


/* =========================
   SEND MESSAGE
========================= */

function send(
    api,
    message,
    threadID,
    replyTo
) {
    return new Promise(resolve => {

        const callback = (error, info) => {

            if (error) {
                console.error(
                    "[MIRA] sendMessage:",
                    error.message
                );

                return resolve(null);
            }

            resolve(info || null);
        };

        try {

            if (replyTo) {

                api.sendMessage(
                    {
                        body: message
                    },
                    threadID,
                    callback,
                    replyTo
                );

            } else {

                api.sendMessage(
                    message,
                    threadID,
                    callback
                );

            }

        } catch (error) {

            console.error(
                "[MIRA] sendMessage exception:",
                error.message
            );

            resolve(null);
        }
    });
}


/* =========================
   URL EXTRACTION
========================= */

function extractURLs(text) {

    if (!text) return [];

    const matches =
        String(text).match(
            /https?:\/\/[^\s<>"']+/gi
        );

    if (!matches) return [];

    return [
        ...new Set(
            matches.map(url =>
                url.replace(
                    /[),.!؟]+$/,
                    ""
                )
            )
        )
    ];
}


/* =========================
   ATTACHMENT TYPE
========================= */

function getAttachmentType(attachment) {

    const type =
        String(
            attachment?.type || ""
        ).toLowerCase();

    const url =
        String(
            attachment?.url || ""
        ).toLowerCase();

    const name =
        String(
            attachment?.filename ||
            attachment?.name ||
            ""
        ).toLowerCase();

    const source =
        `${type} ${url} ${name}`;


    if (
        type.includes("photo") ||
        type.includes("image") ||
        /\.(jpg|jpeg|png|webp|gif)(\?|$)/i
            .test(source)
    ) {
        return "image";
    }


    if (
        type.includes("video") ||
        /\.(mp4|mov|webm|mkv)(\?|$)/i
            .test(source)
    ) {
        return "video";
    }


    if (
        type.includes("audio") ||
        type.includes("voice") ||
        /\.(mp3|wav|m4a|ogg)(\?|$)/i
            .test(source)
    ) {
        return "audio";
    }


    if (
        type.includes("file") ||
        /\.(pdf|txt|csv|json|docx|xlsx)(\?|$)/i
            .test(source)
    ) {
        return "file";
    }


    return "unknown";
}


/* =========================
   EXTENSION
========================= */

function getExtension(attachment) {

    const name =
        String(
            attachment?.filename ||
            attachment?.name ||
            ""
        );

    const match =
        name.match(
            /\.[a-z0-9]{1,8}$/i
        );

    if (match) {
        return match[0];
    }


    const url =
        String(
            attachment?.url || ""
        );

    const urlMatch =
        url.match(
            /\.(jpg|jpeg|png|webp|gif|pdf|txt|json|csv|mp4|mp3|wav|m4a|ogg)(?:\?|$)/i
        );

    if (urlMatch) {
        return `.${urlMatch[1]}`;
    }


    return ".bin";
}


/* =========================
   MIME TYPE
========================= */

function getMimeType(
    filePath,
    attachment,
    kind
) {

    const type =
        String(
            attachment?.type || ""
        ).toLowerCase();


    if (
        kind === "image" ||
        type.includes("image") ||
        type.includes("photo")
    ) {

        if (
            /\.png$/i.test(filePath)
        ) {
            return "image/png";
        }

        if (
            /\.webp$/i.test(filePath)
        ) {
            return "image/webp";
        }

        if (
            /\.gif$/i.test(filePath)
        ) {
            return "image/gif";
        }

        return "image/jpeg";
    }


    if (
        kind === "video" ||
        type.includes("video")
    ) {

        if (
            /\.webm$/i.test(filePath)
        ) {
            return "video/webm";
        }

        if (
            /\.mov$/i.test(filePath)
        ) {
            return "video/quicktime";
        }

        return "video/mp4";
    }


    if (
        kind === "audio" ||
        type.includes("audio") ||
        type.includes("voice")
    ) {

        if (
            /\.wav$/i.test(filePath)
        ) {
            return "audio/wav";
        }

        if (
            /\.ogg$/i.test(filePath)
        ) {
            return "audio/ogg";
        }

        if (
            /\.m4a$/i.test(filePath)
        ) {
            return "audio/mp4";
        }

        return "audio/mpeg";
    }


    if (/\.pdf$/i.test(filePath)) {
        return "application/pdf";
    }

    if (/\.txt$/i.test(filePath)) {
        return "text/plain";
    }

    if (/\.json$/i.test(filePath)) {
        return "application/json";
    }

    if (/\.csv$/i.test(filePath)) {
        return "text/csv";
    }


    return "application/octet-stream";
}


/* =========================
   DOWNLOAD ATTACHMENT
========================= */

async function downloadAttachment(
    attachment
) {

    if (!attachment?.url) {
        throw new Error(
            "رابط المرفق غير موجود."
        );
    }


    await fs.ensureDir(
        CACHE_DIR
    );


    const extension =
        getExtension(attachment);


    const filePath =
        path.join(
            CACHE_DIR,
            `mira_${Date.now()}_${Math.random()
                .toString(36)
                .slice(2, 8)}${extension}`
        );


    const response =
        await axios.get(
            attachment.url,
            {
                responseType:
                    "arraybuffer",

                timeout:
                    30000,

                maxContentLength:
                    MAX_FILE_SIZE,

                maxBodyLength:
                    MAX_FILE_SIZE,

                headers: {
                    "User-Agent":
                        "Mozilla/5.0"
                }
            }
        );


    if (
        !response.data ||
        !response.data.length
    ) {
        throw new Error(
            "المرفق فارغ."
        );
    }


    if (
        response.data.length >
        MAX_FILE_SIZE
    ) {
        throw new Error(
            "حجم المرفق أكبر من الحد المسموح."
        );
    }


    await fs.writeFile(
        filePath,
        response.data
    );


    return filePath;
}


/* =========================
   CLEANUP
========================= */

async function cleanupFiles(files) {

    for (const file of files) {

        try {

            if (
                await fs.pathExists(file)
            ) {
                await fs.remove(file);
            }

        } catch (_) {}
    }
}


/* =========================
   GEMINI RESPONSE
========================= */

function extractGeminiText(
    response
) {

    try {

        if (response?.text) {
            return String(
                response.text
            ).trim();
        }


        if (
            response?.candidates?.[0]
                ?.content?.parts
        ) {

            return response
                .candidates[0]
                .content
                .parts
                .filter(
                    part =>
                        typeof part.text ===
                        "string"
                )
                .map(
                    part =>
                        part.text
                )
                .join("\n")
                .trim();
        }

    } catch (_) {}


    return "";
}


/* =========================
   TEXT ANALYSIS
========================= */

async function analyzeText(
    ai,
    prompt
) {

    const urls =
        extractURLs(prompt);


    const config = {
        systemInstruction:
            MIRA_SYSTEM
    };


    if (urls.length) {

        config.tools = [
            {
                urlContext: {}
            }
        ];
    }


    const response =
        await ai.models.generateContent({

            model: MODEL,

            contents: prompt,

            config
        });


    return {
        text:
            extractGeminiText(
                response
            ),

        response
    };
}


/* =========================
   FILE ANALYSIS
========================= */

async function analyzeFiles(
    ai,
    prompt,
    attachments
) {

    const downloaded = [];


    try {

        const parts = [
            {
                text:
                    prompt ||
                    "حلل المحتوى المرفق واستخرج أهم المعلومات."
            }
        ];


        for (
            const attachment of attachments
        ) {

            const kind =
                getAttachmentType(
                    attachment
                );


            if (
                kind === "unknown"
            ) {
                continue;
            }


            /*
             * الفيديو والصوت:
             * في هذه النسخة نمرر معلومات عن
             * نوع المرفق بدل الادعاء بتحليله.
             */

            if (
                kind === "video" ||
                kind === "audio"
            ) {

                parts.push({
                    text:
                        `يوجد مرفق من نوع ${kind}. ` +
                        `هذا النوع غير مفعّل للتحليل المباشر ` +
                        `في مسار ميرا الحالي.`
                });

                continue;
            }


            const filePath =
                await downloadAttachment(
                    attachment
                );


            downloaded.push(
                filePath
            );


            const mimeType =
                getMimeType(
                    filePath,
                    attachment,
                    kind
                );


            /*
             * الصور
             */

            if (
                kind === "image"
            ) {

                const buffer =
                    await fs.readFile(
                        filePath
                    );


                parts.push({
                    inlineData: {
                        mimeType,
                        data:
                            buffer.toString(
                                "base64"
                            )
                    }
                });


                continue;
            }


            /*
             * الملفات
             */

            const uploadedFile =
                await ai.files.upload({

                    file: filePath,

                    config: {
                        mimeType
                    }
                });


            if (
                !uploadedFile?.uri
            ) {
                throw new Error(
                    "فشل رفع الملف إلى Gemini."
                );
            }


            parts.push({

                fileData: {

                    fileUri:
                        uploadedFile.uri,

                    mimeType:
                        uploadedFile.mimeType ||
                        mimeType
                }

            });
        }


        if (
            parts.length === 1
        ) {
            throw new Error(
                "لم أتمكن من تجهيز المرفق للتحليل."
            );
        }


        const response =
            await ai.models.generateContent({

                model: MODEL,

                contents: [
                    {
                        role: "user",
                        parts
                    }
                ],

                config: {
                    systemInstruction:
                        MIRA_SYSTEM
                }
            });


        return {

            text:
                extractGeminiText(
                    response
                ),

            response
        };


    } finally {

        await cleanupFiles(
            downloaded
        );
    }
}


/* =========================
   HISTORY
========================= */

function buildHistory(
    threadID,
    senderID
) {

    const conversation =
        getConversation(
            threadID,
            senderID
        );


    if (
        !conversation.messages.length
    ) {
        return "";
    }


    return conversation.messages
        .map(
            item =>
                `${item.role}: ${item.content}`
        )
        .join("\n");
}


/* =========================
   CLEAN RESPONSE
========================= */

function cleanResponse(
    text
) {

    let result =
        String(
            text || ""
        ).trim();


    if (!result) {

        return (
            "ما قدرت أطلع نتيجة " +
            "من المحتوى المرسل."
        );
    }


    if (
        result.length > 7000
    ) {

        result =
            result.slice(
                0,
                7000
            ) +
            "\n\n[تم اختصار الرد]";
    }


    return result;
}


/* =========================
   MAIN ANALYZER
========================= */

async function analyze({
    query,
    attachments,
    threadID,
    senderID
}) {

    if (!GEMINI_API_KEY) {

        throw new Error(
            "GEMINI_API_KEY غير موجود."
        );
    }


    const ai =
        new GoogleGenAI({
            apiKey:
                GEMINI_API_KEY
        });


    const history =
        buildHistory(
            threadID,
            senderID
        );


    let prompt =
        query ||
        "حلل المحتوى المرفق.";


    if (history) {

        prompt =
`السياق السابق للمحادثة:
${history}

الطلب الحالي:
${prompt}

استخدمي السياق السابق فقط عندما يكون مرتبطًا بالطلب الحالي.`;
    }


    if (
        Array.isArray(attachments) &&
        attachments.length
    ) {

        const result =
            await analyzeFiles(
                ai,
                prompt,
                attachments
            );


        return cleanResponse(
            result.text
        );
    }


    const result =
        await analyzeText(
            ai,
            prompt
        );


    return cleanResponse(
        result.text
    );
}


/* =========================
   PROCESS REQUEST
========================= */

async function processRequest({
    api,
    event,
    query,
    attachments
}) {

    const {
        threadID,
        senderID,
        messageID
    } = event;


    /*
     * 🧠 ميرا تفكر / تحلل
     */

    await reaction(
        api,
        messageID,
        "🧠"
    );


    await typing(
        api,
        threadID,
        true
    );


    try {

        const answer =
            await analyze({

                query,

                attachments,

                threadID,

                senderID

            });


        addHistory(
            threadID,
            senderID,
            "user",
            query || "[مرفق]"
        );


        addHistory(
            threadID,
            senderID,
            "assistant",
            answer
        );


        /*
         * ✅ نجاح
         */

        await reaction(
            api,
            messageID,
            "✅"
        );


        return answer;


    } catch (error) {

        console.error(
            "[MIRA ERROR]",
            error
        );


        /*
         * ❌ خطأ
         */

        await reaction(
            api,
            messageID,
            "❌"
        );


        return (
            "ما قدرت أحلل المحتوى حاليًا.\n\n" +
            `السبب: ${
                error?.message ||
                "خطأ غير معروف"
            }`
        );


    } finally {

        await typing(
            api,
            threadID,
            false
        );
    }
}


/* =========================
   RUN
========================= */

module.exports.run =
async function ({
    api,
    event,
    args
}) {

    const query =
        Array.isArray(args)
            ? args.join(" ").trim()
            : "";


    /*
     * المرفقات الموجودة مع الرسالة
     */

    const currentAttachments =
        Array.isArray(
            event.attachments
        )
            ? event.attachments
            : [];


    /*
     * المرفقات الموجودة في الرسالة
     * التي يرد عليها المستخدم
     */

    const replyAttachments =
        Array.isArray(
            event.messageReply
                ?.attachments
        )
            ? event.messageReply
                .attachments
            : [];


    /*
     * دمج المرفقات
     */

    const attachments = [
        ...currentAttachments,
        ...replyAttachments
    ];


    if (
        !query &&
        !attachments.length
    ) {

        return send(

            api,

`╭──〔 ميرا 〕──╮
│
│ أنا جاهزة لتحليل:
│
│ ⎔ النصوص
│ ⎔ الصور
│ ⎔ الروابط
│ ⎔ الملفات
│ ⎔ البيانات
│
│ مثال:
│ ميرا حللي الصورة دي
│
│ أو:
│ ميرا حللي الرابط دا
│
╰────────────────`,

            event.threadID,

            event.messageID
        );
    }


    const answer =
        await processRequest({

            api,

            event,

            query,

            attachments

        });


    const info =
        await send(

            api,

            answer,

            event.threadID,

            event.messageID

        );


    /*
     * تسجيل الرد لمواصلة المحادثة
     */

    if (
        info?.messageID &&
        Array.isArray(
            global.client?.handleReply
        )
    ) {

        global.client.handleReply.push({

            name: "ميرا",

            messageID:
                info.messageID,

            author:
                event.senderID,

            threadID:
                event.threadID,

            type: "mira",

            createdAt:
                Date.now()

        });
    }


    return info;
};


/* =========================
   HANDLE REPLY
========================= */

module.exports.handleReply =
async function ({
    api,
    event,
    handleReply
}) {

    if (!handleReply) {
        return;
    }


    /*
     * التأكد أن الرد داخل نفس المجموعة
     */

    if (
        String(
            handleReply.threadID
        ) !==
        String(
            event.threadID
        )
    ) {
        return;
    }


    /*
     * النص الجديد
     */

    const query =
        String(
            event.body || ""
        ).trim();


    /*
     * مرفقات الرسالة الجديدة
     */

    const attachments =
        Array.isArray(
            event.attachments
        )
            ? event.attachments
            : [];


    /*
     * مرفقات الرسالة التي يتم الرد عليها
     */

    const replyAttachments =
        Array.isArray(
            event.messageReply
                ?.attachments
        )
            ? event.messageReply
                .attachments
            : [];


    /*
     * دمج المرفقات
     */

    const allAttachments = [

        ...attachments,

        ...replyAttachments

    ];


    /*
     * لا يوجد شيء للتحليل
     */

    if (
        !query &&
        !allAttachments.length
    ) {
        return;
    }


    /*
     * تشغيل ميرا
     */

    const answer =
        await processRequest({

            api,

            event,

            query,

            attachments:
                allAttachments

        });


    /*
     * إرسال النتيجة
     */

    const info =
        await send(

            api,

            answer,

            event.threadID,

            event.messageID

        );


    /*
     * إبقاء نظام الرد فعالاً
     */

    if (
        info?.messageID &&
        Array.isArray(
            global.client?.handleReply
        )
    ) {

        global.client.handleReply.push({

            name: "ميرا",

            messageID:
                info.messageID,

            author:
                event.senderID,

            threadID:
                event.threadID,

            type: "mira",

            createdAt:
                Date.now()

        });
    }


    return info;
};
