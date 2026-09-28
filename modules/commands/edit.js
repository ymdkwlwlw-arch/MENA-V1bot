const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const getBaseApiUrl = async () => {
  try {
    const res = await axios.get(
      "https://raw.githubusercontent.com/mahmudx7/HINATA/main/baseApiUrl.json",
      { timeout: 5000 }
    );
    return res.data?.mahmud || null;
  } catch (e) {
    return null;
  }
};

const translateText = async (text) => {
  try {
    const res = await axios.get(
      "https://translate.googleapis.com/translate_a/single",
      {
        params: {
          client: "gtx",
          sl: "auto",
          tl: "en",
          dt: "t",
          q: text
        },
        timeout: 10000
      }
    );

    return res.data?.[0]?.[0]?.[0] || text;
  } catch (e) {
    return text;
  }
};

module.exports.config = {
  name: "تعديل",
  aliases: ["عدلي", "edit", "imgedit"],
  version: "7.0.0",
  hasPermssion: 0,
  credits: "SINKO & AI / KIROS",
  description: "تعديل الصور بالذكاء الاصطناعي",
  commandCategory: "الصور",
  usages: "الرد على صورة + وصف التعديل",
  cooldowns: 5,
  usePrefix: true
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, messageReply } = event;
  const promptAr = args.join(" ").trim();

  if (!promptAr) {
    return api.sendMessage(
      "╭─❖ [ نظام التعديل ] ❖─╮\n\n" +
      "⚠️ لازم ترد على صورة وتكتب وصف التعديل المطلوب.\n\n" +
      "مثال:\n" +
      "/تعديل اجعل الخلفية ليلية مع إضاءة سينمائية\n\n" +
      "╰───────────────╯",
      threadID,
      messageID
    );
  }

  const attachment = messageReply?.attachments?.[0];

  if (
    !attachment ||
    (attachment.type !== "photo" && attachment.type !== "image")
  ) {
    return api.sendMessage(
      "╭─❖ [ نظام التعديل ] ❖─╮\n\n" +
      "⚠️ يجب الرد على صورة أولًا.\n\n" +
      "╰───────────────╯",
      threadID,
      messageID
    );
  }

  const imageUrl = attachment.url;

  if (!imageUrl) {
    return api.sendMessage(
      "❌ لم أستطع الحصول على رابط الصورة.",
      threadID,
      messageID
    );
  }

  try {
    await api.setMessageReaction("⏳", messageID, threadID);
  } catch (e) {}

  let waitMsgID = null;

  try {
    await new Promise((resolve) => {
      api.sendMessage(
        "╭─❖ [ معالجة الصورة ] ❖─╮\n\n" +
        "⏳ جاري إرسال الصورة إلى خدمة التعديل...\n" +
        "قد تستغرق العملية بعض الوقت.\n\n" +
        "╰───────────────╯",
        threadID,
        (err, info) => {
          if (!err && info) waitMsgID = info.messageID;
          resolve();
        },
        messageID
      );
    });
  } catch (e) {}

  const cacheDir = path.join(__dirname, "cache");
  await fs.ensureDir(cacheDir);

  const fileName =
    `edit_${Date.now()}_` +
    Math.random().toString(36).slice(2, 8) +
    ".jpg";

  const imgPath = path.join(cacheDir, fileName);

  const promptEn = await translateText(promptAr);
  const baseApi = await getBaseApiUrl();

  const servers = [
    {
      name: "Uncensored SD",
      method: "GET",
      url:
        "https://uncensored-sd.onrender.com/api/sd" +
        `?prompt=${encodeURIComponent(
          promptEn + ", high quality, detailed, cinematic lighting"
        )}` +
        `&imageUrl=${encodeURIComponent(imageUrl)}` +
        `&v=${Date.now()}`,
      responseType: "stream"
    },
    {
      name: "Azad API",
      method: "GET",
      url:
        "https://azadx69x.is-a.dev/api/editor" +
        `?url=${encodeURIComponent(imageUrl)}` +
        `&prompt=${encodeURIComponent(promptEn)}`,
      responseType: "stream"
    }
  ];

  if (baseApi) {
    servers.push({
      name: "Hakim API",
      method: "POST",
      url: `${baseApi}/api/edit`,
      data: {
        prompt: promptEn,
        imageUrl
      },
      responseType: "arraybuffer"
    });
  }

  let success = false;
  let usedServer = null;

  for (const server of servers) {
    try {
      console.log(`[EDIT] Trying server: ${server.name}`);

      let response;

      if (server.method === "POST") {
        response = await axios.post(
          server.url,
          server.data,
          {
            responseType: "arraybuffer",
            timeout: 90000,
            headers: {
              "User-Agent": "Mozilla/5.0"
            }
          }
        );

        await fs.writeFile(
          imgPath,
          Buffer.from(response.data)
        );
      } else {
        response = await axios.get(
          server.url,
          {
            responseType: "stream",
            timeout: 90000,
            headers: {
              "User-Agent": "Mozilla/5.0"
            }
          }
        );

        await new Promise((resolve, reject) => {
          const writer = fs.createWriteStream(imgPath);

          response.data.pipe(writer);

          writer.on("finish", resolve);
          writer.on("error", reject);
        });
      }

      if (
        fs.existsSync(imgPath) &&
        fs.statSync(imgPath).size > 1000
      ) {
        success = true;
        usedServer = server.name;

        console.log(`[EDIT] SUCCESS: ${server.name}`);
        break;
      }

      throw new Error("الخادم أعاد ملفًا غير صالح");

    } catch (error) {
      console.log(
        `[EDIT] FAILED: ${server.name} -> ${error.message}`
      );

      try {
        if (fs.existsSync(imgPath)) {
          await fs.remove(imgPath);
        }
      } catch (e) {}
    }
  }

  if (waitMsgID) {
    try {
      await api.unsendMessage(waitMsgID, threadID);
    } catch (e) {}
  }

  if (!success) {
    try {
      await api.setMessageReaction("❌", messageID, threadID);
    } catch (e) {}

    return api.sendMessage(
      "╭─❖ [ فشل التعديل ] ❖─╮\n\n" +
      "❌ لم تنجح أي خدمة في معالجة الصورة حاليًا.\n\n" +
      "جرّب مرة أخرى بعد قليل.\n\n" +
      "╰───────────────╯",
      threadID,
      messageID
    );
  }

  try {
    await api.setMessageReaction("✅", messageID, threadID);
  } catch (e) {}

  console.log(`[EDIT] Final server: ${usedServer}`);

  return api.sendMessage(
    {
      body:
        "╭─❖ [ نجاح التعديل ] ❖─╮\n\n" +
        `📝 الوصف: ${promptAr}\n` +
        `⚙️ الخدمة: ${usedServer}\n\n` +
        "╰───────────────╯",

      attachment: fs.createReadStream(imgPath)
    },
    threadID,
    () => {
      setTimeout(() => {
        try {
          if (fs.existsSync(imgPath)) {
            fs.unlinkSync(imgPath);
          }
        } catch (e) {}
      }, 15000);
    },
    messageID
  );
};
