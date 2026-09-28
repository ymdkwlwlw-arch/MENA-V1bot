const axios = require("axios");

module.exports.config = {
  name: "ويكي",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "KIROS",
  description: "ويكيبيديا + أسعار العملات الذكية",
  commandCategory: "المعلومات",
  usages: "ويكي <سؤال>",
  cooldowns: 3,
  usePrefix: true,
  aliases: ["wiki", "ويكيبيديا", "معلومات"]
};

const WIKI_API = "https://ar.wikipedia.org/w/api.php";
const WIKI_SUMMARY = "https://ar.wikipedia.org/api/rest_v1/page/summary";
const FX_API = "https://api.frankfurter.dev/v2/rates";

const currencyMap = {
  "الدولار": "USD",
  "دولار": "USD",
  "الريال السعودي": "SAR",
  "ريال سعودي": "SAR",
  "الريال": "SAR",
  "اليورو": "EUR",
  "يورو": "EUR",
  "الجنيه المصري": "EGP",
  "جنيه مصري": "EGP",
  "الجنيه الاسترليني": "GBP",
  "الجنيه الإسترليني": "GBP",
  "الاسترليني": "GBP",
  "الإسترليني": "GBP",
  "الدرهم الإماراتي": "AED",
  "درهم إماراتي": "AED",
  "الريال القطري": "QAR",
  "ريال قطري": "QAR",
  "الدينار الكويتي": "KWD",
  "دينار كويتي": "KWD",
  "الدينار": "KWD",
  "اليوان": "CNY",
  "اليوان الصيني": "CNY",
  "الليرة التركية": "TRY",
  "الليرة": "TRY"
};

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[إأآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[؟?!،]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectCurrencyQuestion(query) {
  const text = normalize(query);

  const keywords = [
    "سعر",
    "اسعار",
    "سعر الصرف",
    "صرف",
    "كم يساوي",
    "يساوي",
    "عملة",
    "عمله",
    "مقابل",
    "الدولار",
    "دولار",
    "الريال",
    "اليورو",
    "يورو",
    "الجنيه",
    "درهم",
    "الدينار",
    "اليوان",
    "الليره",
    "ليره"
  ];

  const isCurrency = keywords.some(word => text.includes(normalize(word)));

  if (!isCurrency) return null;

  let currency = "USD";

  const sorted = Object.keys(currencyMap).sort(
    (a, b) => b.length - a.length
  );

  for (const name of sorted) {
    if (text.includes(normalize(name))) {
      currency = currencyMap[name];
      break;
    }
  }

  return currency;
}

function currencyName(code) {
  const names = {
    USD: "الدولار الأمريكي",
    SAR: "الريال السعودي",
    EUR: "اليورو",
    EGP: "الجنيه المصري",
    GBP: "الجنيه الإسترليني",
    AED: "الدرهم الإماراتي",
    QAR: "الريال القطري",
    KWD: "الدينار الكويتي",
    CNY: "اليوان الصيني",
    TRY: "الليرة التركية"
  };

  return names[code] || code;
}

function formatNumber(number) {
  return new Intl.NumberFormat("ar-SA", {
    maximumFractionDigits: 2
  }).format(number);
}

async function getCurrencyRate(currency) {
  const url = `${FX_API}?base=${currency}&symbols=SDG`;

  const response = await axios.get(url, {
    timeout: 10000,
    headers: {
      "User-Agent": "KIROS-BOT/2.0"
    }
  });

  if (!response.data || !response.data.rates) {
    throw new Error("بيانات العملة غير متوفرة");
  }

  const rate = response.data.rates.SDG;

  if (!rate || isNaN(rate)) {
    throw new Error("لم يتم العثور على سعر العملة");
  }

  return {
    rate,
    date: response.data.date,
    currency
  };
}

async function searchWikipedia(query) {
  const response = await axios.get(WIKI_API, {
    timeout: 10000,
    params: {
      action: "query",
      list: "search",
      srsearch: query,
      srlimit: 1,
      format: "json",
      utf8: 1,
      origin: "*"
    },
    headers: {
      "User-Agent": "KIROS-BOT/2.0"
    }
  });

  const results = response.data?.query?.search;

  if (!results || !results.length) {
    throw new Error("لم يتم العثور على نتائج");
  }

  return results[0].title;
}

async function getWikipediaSummary(title) {
  const encoded = encodeURIComponent(title);

  const response = await axios.get(
    `${WIKI_SUMMARY}/${encoded}`,
    {
      timeout: 10000,
      headers: {
        "User-Agent": "KIROS-BOT/2.0"
      }
    }
  );

  return response.data;
}

async function sendCurrency(api, event, currency) {
  const threadID = event.threadID;

  try {
    const data = await getCurrencyRate(currency);

    const name = currencyName(currency);
    const rate = formatNumber(data.rate);

    const message =
`╭─❖ [ سعر الصرف ] ❖─╮
│
│ 💵 ${name}
│ 🇸🇩 مقابل الجنيه السوداني
│
│ 1 ${currency} = ${rate} SDG
│
│ 📅 التحديث: ${data.date}
│
│ ℹ️ السعر المعروض سعر صرف
│ متوسط وليس بالضرورة سعر السوق
│ الموازي في السودان.
│
│ 🔗 المصدر: Frankfurter
│
╰──────────────────╯`;

    return api.sendMessage(message, threadID);
  } catch (error) {
    console.log("[WIKI FX ERROR]", error.message);

    return api.sendMessage(
`╭─❖ [ خطأ ] ❖─╮
│
│ ❌ تعذر جلب سعر العملة حالياً.
│
│ جرّب مرة ثانية بعد قليل.
│
╰────────────────╯`,
      threadID
    );
  }
}

async function sendWikipedia(api, event, query) {
  const threadID = event.threadID;

  try {
    const title = await searchWikipedia(query);
    const data = await getWikipediaSummary(title);

    const extract = data.extract
      ? data.extract.slice(0, 1800)
      : "لا يوجد ملخص متاح.";

    const url =
      data.content_urls?.desktop?.page ||
      `https://ar.wikipedia.org/wiki/${encodeURIComponent(title)}`;

    const message =
`╭─❖ [ ويكيبيديا ] ❖─╮
│
│ 📚 ${data.title || title}
│
${extract
  .split("\n")
  .map(line => `│ ${line}`)
  .join("\n")}
│
│ 🔗 ${url}
│
╰──────────────────╯`;

    return api.sendMessage(message, threadID);
  } catch (error) {
    console.log("[WIKI ERROR]", error.message);

    return api.sendMessage(
`╭─❖ [ ويكيبيديا ] ❖─╮
│
│ ❌ لم أجد معلومات مناسبة.
│
│ جرّب كتابة السؤال بشكل أبسط.
│
╰──────────────────╯`,
      threadID
    );
  }
}

module.exports.run = async function ({ api, event, args }) {
  const query = args.join(" ").trim();

  if (!query) {
    return api.sendMessage(
`╭─❖ [ ويكي ] ❖─╮
│
│ 📚 معلومات:
│ /ويكي من هو الخوارزمي
│
│ 💵 عملات:
│ /ويكي سعر الدولار في السودان
│ /ويكي سعر الريال السعودي
│ /ويكي كم يساوي اليورو
│
╰────────────────╯`,
      event.threadID
    );
  }

  const currency = detectCurrencyQuestion(query);

  api.setMessageReaction("🔎", event.messageID, event.threadID);

  if (currency) {
    return sendCurrency(api, event, currency);
  }

  return sendWikipedia(api, event, query);
};
