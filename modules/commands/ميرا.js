const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const { GoogleGenAI } = require("@google/genai");

module.exports.config = {
    name: "ميرا",
    aliases: ["mira", "ميراai"],
    version: "1.0.0",
    hasPermssion: 0,
    credits: "KIROS",
    description: "ميرا — محللة ذكية للنصوص والصور والروابط والملفات",
    usePrefix: false,
    commandCategory: "الذكاء الاصطناعي",
    usages: "ميرا [سؤالك] أو بالرد على صورة/ملف",
    cooldowns: 3
};


/* =========================================================
   الإعدادات
========================================================= */

const GEMINI_API_KEY =
    process.env.GEMINI_API_KEY;

const MODEL =
    process.env.MIRA_MODEL ||
    "gemini-3.8-flash";

const CACHE_DIR =
    path.join(
        __dirname,
        "cache",
        "mira"
    );

const MAX_HISTORY = 10;

const MAX_FILE_SIZE =
    25 * 1024 * 1024;


/* =========================================================
   شخصية ميرا
========================================================= */

const MIRA_SYSTEM = `
أنتِ ميرا، مساعدة ذكاء اصطناعي متعددة الوسائط داخل بوت Messenger.

وظيفتك الأساسية:
- تحليل النصوص.
- تحليل الصور.
- استخراج المعلومات من الصور.
- تحليل الروابط وصفحات الويب التي يتم توفيرها لك.
- تحليل الملفات المدعومة.
- تلخيص المحتوى.
- استخراج البيانات والجداول والمعلومات المهمة.
- مقارنة المعلومات عندما يطلب المستخدم ذلك.

أسلوبك:
- عربية واضحة وطبيعية.
- يمكن استخدام اللهجة السودانية عند الحاجة.
- هادئة ومباشرة.
- لا تكرري كلام المستخدم بلا داعٍ.
- لا تختلقي معلومات.
- إذا لم تتمكني من الوصول إلى رابط أو ملف، قولي ذلك بوضوح.
- ميزي دائمًا بين المعلومات التي رأيتها فعليًا وبين التخمين.
- إذا كانت الصورة غير واضحة، اذكري أن القراءة غير مؤكدة.
- إذا كان السؤال يحتاج معلومات من الرابط، اعتمدي على المحتوى الذي تم الوصول إليه وليس على التخمين.

الوسائط:
- عند وجود صورة، حللي الصورة نفسها.
- عند وجود أكثر من صورة، قارني بينها إذا كان ذلك مناسبًا.
- عند وجود ملف، حللي محتواه إذا كان مدعومًا.
- عند وجود رابط، استخدمي أداة URL Context عندما تكون متاحة.

الأمان:
- لا تكشفي API keys.
- لا تكشفي كلمات المرور.
- لا تكشفي AppState أو session cookies.
- لا تنفذي Shell أو JavaScript يرسله المستخدم.
- لا تعدي المستخدم بأنك نفذت عملية خارجية إذا لم يتم تنفيذها فعليًا.
`;


/* =========================================================
   الذاكرة
========================================================= */

const conversations =
    new Map();

function getKey(
    threadID,
    senderID
) {
    return `${threadID}:${senderID}`;
}

function getConversation(
    threadID,
    senderID
) {

    const key =
        getKey(
            threadID,
            senderID
        );

    if (
        !conversations.has(key)
    ) {

        conversations.set(
            key,
            {
                messages: [],
                lastActivity:
                    Date.now()
            }
        );
    }

    const conversation =
        conversations.get(key);

    conversation.lastActivity =
        Date.now();

    return conversation;
}

function addHistory(
    threadID,
    senderID,
    role,
    content
) {

    const conversation =
        getConversation(
            threadID,
            senderID
        );

    conversation.messages.push({
        role,
        content:
            String(content)
    });

    if (
        conversation.messages.length >
        MAX_HISTORY
    ) {

        conversation.messages =
            conversation.messages.slice(
                -MAX_HISTORY
            );
    }
}


/* تنظيف الذاكرة */

setInterval(
    () => {

        const now =
            Date.now();

        for (
            const [
                key,
                value
            ]
            of conversations
        ) {

            if (
                now -
                value.lastActivity >
                60 * 60 * 1000
            ) {

                conversations.delete(
                    key
                );
            }
        }

    },
    10 * 60 * 1000
);


/* =========================================================
   أدوات Messenger
========================================================= */

async function reaction(
    api,
    messageID,
    emoji
) {

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


async function typing(
    api,
    threadID,
    state
) {

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


function send(
    api,
    message,
    threadID,
    replyTo
) {

    return new Promise(
        resolve => {

            const callback =
                (error, info) => {

                    if (error) {

                        console.error(
                            "[MIRA] sendMessage:",
                            error.message
                        );

                        return resolve(
                            null
                        );
                    }

                    resolve(
                        info || null
                    );
                };

            if (replyTo) {

                api.sendMessage(
                    {
                        body:
                            message
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
        }
    );
}


/* =========================================================
   استخراج روابط من النص
========================================================= */

function extractURLs(
    text
) {

    if (!text) {
        return [];
    }

    const matches =
        String(text).match(
            /https?:\/\/[^\s<>"']+/gi
        );

    if (!matches) {
        return [];
    }

    return [
        ...new Set(
            matches.map(
                url =>
                    url.replace(
                        /[),.!؟]+$/,
                        ""
                    )
            )
        )
    ];
}


/* =========================================================
   معرفة نوع المرفق
========================================================= */

function getAttachmentType(
    attachment
) {

    const type =
        String(
            attachment?.type ||
            ""
        ).toLowerCase();

    const url =
        String(
            attachment?.url ||
            ""
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
        /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(
            source
        )
    ) {
        return "image";
    }

    if (
        type.includes("video") ||
        /\.(mp4|mov|webm|mkv)(\?|$)/i.test(
            source
        )
    ) {
        return "video";
    }

    if (
        type.includes("audio") ||
        type.includes("voice") ||
        /\.(mp3|wav|m4a|ogg)(\?|$)/i.test(
            source
        )
    ) {
        return "audio";
    }

    if (
        type.includes("file") ||
        /\.(pdf|txt|csv|json|docx|xlsx)(\?|$)/i.test(
            source
        )
    ) {
        return "file";
    }

    return "unknown";
}


/* =========================================================
   تحميل مرفق
========================================================= */

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
        getExtension(
            attachment
        );

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


/* =========================================================
   امتداد الملف
========================================================= */

function getExtension(
    attachment
) {

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
            attachment?.url ||
            ""
        );

    const urlMatch =
        url.match(
            /\.(jpg|jpeg|png|webp|gif|pdf|txt|mp4|mp3|wav)(?:\?|$)/i
        );

    if (urlMatch) {
        return `.${urlMatch[1]}`;
    }

    return ".bin";
}


/* =========================================================
   MIME
========================================================= */

function getMimeType(
    filePath,
    attachment
) {

    const type =
        String(
            attachment?.type ||
            ""
        ).toLowerCase();

    if (
        type.includes("image")
    ) {

        if (
            /\.png$/i.test(filePath)
        ) return "image/png";

        if (
            /\.webp$/i.test(filePath)
        ) return "image/webp";

        if (
            /\.gif$/i.test(filePath)
        ) return "image/gif";

        return "image/jpeg";
    }

    if (
        /\.pdf$/i.test(filePath)
    ) {
        return "application/pdf";
    }

    if (
        /\.txt$/i.test(filePath)
    ) {
        return "text/plain";
    }

    if (
        /\.json$/i.test(filePath)
    ) {
        return "application/json";
    }

    return "application/octet-stream";
}


/* =========================================================
   تنظيف الملفات
========================================================= */

async function cleanupFiles(
    files
) {

    for (
        const file
        of files
    ) {

        try {

            if (
                await fs.pathExists(
                    file
                )
            ) {

                await fs.remove(
                    file
                );
            }

        } catch (_) {}
    }
}


/* =========================================================
   استخراج النص من نتيجة Gemini
========================================================= */

function extractGeminiText(
    response
) {

    if (
        response?.output_text
    ) {

        return String(
            response.output_text
        ).trim();
    }

    if (
        response?.text
    ) {

        return String(
            response.text
        ).trim();
    }

    let text = "";

    try {

        for (
            const step
            of response?.steps || []
        ) {

            if (
                step.type !==
                "model_output"
            ) {
                continue;
            }

            for (
                const block
                of step.content || []
            ) {

                if (
                    block.type ===
                    "text"
                ) {

                    text +=
                        `${block.text}\n`;
                }
            }
        }

    } catch (_) {}

    return text.trim();
}


/* =========================================================
   تحليل نص / روابط
========================================================= */

async function analyzeText(
    ai,
    prompt
) {

    const urls =
        extractURLs(
            prompt
        );

    const tools = [];

    if (urls.length) {

        tools.push({
            type:
                "url_context"
        });
    }

    const input =
        prompt;

    const response =
        await ai.interactions.create({
            model:
                MODEL,

            input,

            tools,

            system_instruction:
                MIRA_SYSTEM
        });

    return {
        text:
            extractGeminiText(
                response
            ),

        response
    };
}


/* =========================================================
   تحليل الصور والملفات
========================================================= */

async function analyzeFiles(
    ai,
    prompt,
    attachments
) {

    const downloaded = [];
    const uploaded = [];

    try {

        const inputs = [
            {
                type:
                    "text",

                text:
                    prompt ||
                    "حللي المحتوى المرفق واستخرجي المعلومات المهمة."
            }
        ];


        /*
         * تحميل المرفقات
         */

        for (
            const attachment
            of attachments
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
             * الصوت والفيديو يحتاجان
             * معالجة منفصلة حسب دعم
             * النموذج/الـAPI.
             */

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
                    attachment
                );


            /*
             * رفع الملف إلى Gemini Files API
             */

            const uploadedFile =
                await ai.files.upload({
                    file:
                        filePath,

                    config: {
                        mimeType
                    }
                });

            uploaded.push(
                uploadedFile
            );


            /*
             * إدخال الملف
             */

            inputs.push({
                type:
                    kind === "image"
                        ? "image"
                        : "file",

                uri:
                    uploadedFile.uri,

                mime_type:
                    uploadedFile.mimeType ||
                    mimeType
            });
        }


        if (
            inputs.length === 1
        ) {

            throw new Error(
                "لم أتمكن من تجهيز المرفق للتحليل."
            );
        }


        const response =
            await ai.interactions.create({
                model:
                    MODEL,

                input:
                    inputs,

                system_instruction:
                    MIRA_SYSTEM
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

        /*
         * لا نحذف ملفات Gemini هنا.
         * يتم تنظيفها من جهة الخدمة
         * وفق دورة حياة Files API.
         */
    }
}


/* =========================================================
   بناء سياق الذاكرة
========================================================= */

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


/* =========================================================
   تنظيف الرد
========================================================= */

function cleanResponse(
    text
) {

    let result =
        String(
            text || ""
        ).trim();

    if (!result) {

        return "ما قدرت أطلع نتيجة من المحتوى المرسل.";
    }

    /*
     * حد أقصى مناسب للرسالة
     */

    if (
        result.length >
        7000
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


/* =========================================================
   المحرك الرئيسي
========================================================= */

async function analyze({
    query,
    attachments,
    threadID,
    senderID
}) {

    if (
        !GEMINI_API_KEY
    ) {

        throw new Error(
            "GEMINI_API_KEY غير موجود."
        );
    }

    const ai =
        new GoogleGenAI({
            apiKey:
                GEMINI_API_KEY
        });


    /*
     * إضافة الذاكرة للنص
     */

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


    /*
     * هل توجد مرفقات؟
     */

    if (
        Array.isArray(
            attachments
        ) &&
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


    /*
     * نص / روابط
     */

    const result =
        await analyzeText(
            ai,
            prompt
        );

    return cleanResponse(
        result.text
    );
}


/* =========================================================
   إرسال النتيجة وتسجيل الذاكرة
========================================================= */

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

    await reaction(
        api,
        messageID,
        "⏳"
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
            query ||
                "[مرفق]"
        );

        addHistory(
            threadID,
            senderID,
            "assistant",
            answer
        );


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

        await reaction(
            api,
            messageID,
            "❌"
        );

        return (
            "ما قدرت أحلل المحتوى حاليًا.\n\n" +
            `السبب: ${
                error.message ||
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


/* =========================================================
   الأمر
========================================================= */

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
     * مرفقات الرسالة الحالية
     */

    const currentAttachments =
        Array.isArray(
            event.attachments
        )
            ? event.attachments
            : [];


    /*
     * مرفقات الرسالة التي نرد عليها
     */

    const replyAttachments =
        Array.isArray(
            event.messageReply?.attachments
        )
            ? event.messageReply.attachments
            : [];


    /*
     * دمج المرفقات بدون تكرار
     */

    const attachments =
        [
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
│ ⎔ الملفات المدعومة
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
     * تسجيل Reply
     */

    if (
        info?.messageID &&
        Array.isArray(
            global.client?.handleReply
        )
    ) {

        global.client.handleReply.push({
            name:
                "ميرا",

            messageID:
                info.messageID,

            author:
                event.senderID,

            threadID:
                event.threadID,

            type:
                "mira",

            createdAt:
                Date.now()
        });
    }

    return info;
};


/* =========================================================
   استمرار المحادثة
========================================================= */

module.exports.handleReply =
async function ({
    api,
    event,
    handleReply
}) {

    if (
        !handleReply
    ) {
        return;
    }

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


    const query =
        String(
            event.body ||
            ""
        ).trim();


    const attachments =
        Array.isArray(
            event.attachments
        )
            ? event.attachments
            : [];


    const replyAttachments =
        Array.isArray(
            event.messageReply?.attachments
        )
            ? event.messageReply.attachments
            : [];


    const allAttachments =
        [
            ...attachments,
            ...replyAttachments
        ];


    if (
        !query &&
        !allAttachments.length
    ) {
        return;
    }


    const answer =
        await processRequest({
            api,
            event,
            query,
            attachments:
                allAttachments
        });


    const info =
        await send(
            api,
            answer,
            event.threadID,
            event.messageID
        );


    if (
        info?.messageID &&
        Array.isArray(
            global.client?.handleReply
        )
    ) {

        global.client.handleReply.push({
            name:
                "ميرا",

            messageID:
                info.messageID,

            author:
                event.senderID,

            threadID:
                event.threadID,

            type:
                "mira",

            createdAt:
                Date.now()
        });
    }

    return info;
};
