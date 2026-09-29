const os = require("os");
const process = require("process");

module.exports.config = {
    name: "ابتايم",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "KIROS",
    description: "عرض حالة البوت وموارد الاستضافة",
    commandCategory: "النظام",
    usages: "ابتايم",
    cooldowns: 5,
    usePrefix: true
};

function formatUptime(seconds) {
    seconds = Math.floor(seconds);

    const days = Math.floor(seconds / 86400);
    seconds %= 86400;

    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;

    const minutes = Math.floor(seconds / 60);
    seconds %= 60;

    return `${days} يوم ${hours} ساعة ${minutes} دقيقة ${seconds} ثانية`;
}

function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return "0 MB";

    const mb = bytes / 1024 / 1024;

    if (mb < 1024) {
        return `${mb.toFixed(1)} MB`;
    }

    return `${(mb / 1024).toFixed(2)} GB`;
}

function getCpuUsage() {
    const cpus = os.cpus();

    let idle = 0;
    let total = 0;

    for (const cpu of cpus) {
        idle += cpu.times.idle;

        total +=
            cpu.times.user +
            cpu.times.nice +
            cpu.times.sys +
            cpu.times.irq +
            cpu.times.idle;
    }

    if (total === 0) return "0.0";

    return ((1 - idle / total) * 100).toFixed(1);
}

function getMemoryUsage() {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;

    return {
        total,
        free,
        used,
        percent: ((used / total) * 100).toFixed(1)
    };
}

function getProcessMemory() {
    const memory = process.memoryUsage();

    return {
        rss: memory.rss,
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        external: memory.external
    };
}

async function getPing(api, threadID) {
    const start = Date.now();

    try {
        await new Promise((resolve, reject) => {
            api.getThreadInfo(
                threadID,
                (error) => {
                    if (error) {
                        return reject(error);
                    }

                    resolve();
                }
            );
        });

        return Date.now() - start;

    } catch (_) {
        return Date.now() - start;
    }
}

module.exports.run = async function ({
    api,
    event
}) {
    const {
        threadID,
        messageID
    } = event;

    const start = Date.now();

    try {
        const ping = await getPing(
            api,
            threadID
        );

        const memory = getMemoryUsage();
        const processMemory = getProcessMemory();

        const cpu = getCpuUsage();

        const botUptime =
            process.uptime();

        const serverUptime =
            os.uptime();

        const cpuCount =
            os.cpus().length;

        const nodeVersion =
            process.version;

        const platform =
            `${os.platform()} ${os.arch()}`;

        const hostname =
            os.hostname();

        const load =
            os.loadavg();

        const eventLoop =
            Date.now() - start;

        let status = "مستقر";

        if (ping >= 1000) {
            status = "بطيء";
        } else if (ping >= 500) {
            status = "مضغوط";
        }

        const result = `
╭─〔 حالة البوت 〕─╮
│
│ الحالة           : ${status}
│
│ تشغيل البوت      : ${formatUptime(botUptime)}
│ تشغيل الاستضافة  : ${formatUptime(serverUptime)}
│
│ سرعة الاستجابة   : ${ping} ms
│ تأخر المحرك      : ${eventLoop} ms
│
│ المعالج          : ${cpu}%
│ أنوية المعالج    : ${cpuCount}
│ متوسط الحمل      : ${load[0].toFixed(2)}
│
│ RAM المستخدمة    : ${formatBytes(memory.used)}
│ RAM المتاحة      : ${formatBytes(memory.free)}
│ RAM الكلية       : ${formatBytes(memory.total)}
│ استخدام RAM      : ${memory.percent}%
│
│ ذاكرة البوت      : ${formatBytes(processMemory.rss)}
│ Heap المستخدم    : ${formatBytes(processMemory.heapUsed)}
│ Heap الكلي       : ${formatBytes(processMemory.heapTotal)}
│ الذاكرة الخارجية : ${formatBytes(processMemory.external)}
│
│ Node.js          : ${nodeVersion}
│ النظام           : ${platform}
│ الخادم           : ${hostname}
│
╰─〔 KIROS MONITOR 〕─╯
`;

        return api.sendMessage(
            result.trim(),
            threadID,
            messageID
        );

    } catch (error) {
        console.error(
            "[ابتـايم ERROR]",
            error
        );

        return api.sendMessage(
            "تعذر قراءة حالة النظام حاليًا.",
            threadID,
            messageID
        );
    }
};
