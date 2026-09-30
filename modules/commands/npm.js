const fs = require("fs-extra");
const path = require("path");
const { execFile } = require("child_process");

module.exports.config = {
	name: "npm",
	aliases: ["packages", "libs"],
	version: "3.0.0",
	hasPermssion: 2,
	credits: "KIROS",
	description: "Advanced npm package manager",
	usePrefix: true,
	commandCategory: "system",
	usages: "npm install <package>",
	cooldowns: 10,

	dependencies: {
		"fs-extra": ""
	}
};


// ==================================================
// PATHS
// ==================================================

const ROOT_DIR = path.resolve(__dirname, "../../");

const PACKAGE_JSON = path.join(
	ROOT_DIR,
	"package.json"
);

const PACKAGE_LOCK = path.join(
	ROOT_DIR,
	"package-lock.json"
);


// ==================================================
// AUTO UPDATE SETTINGS
// ==================================================

const AUTO_UPDATE = true;

// التحديث الدوري كل ساعة
const AUTO_UPDATE_INTERVAL = 60 * 60 * 1000;


// ==================================================
// NPM EXECUTER
// ==================================================

const NPM_COMMAND =
	process.platform === "win32"
		? "npm.cmd"
		: "npm";


// ==================================================
// RUN NPM
// ==================================================

function runNpm(args, timeout = 180000) {

	return new Promise((resolve, reject) => {

		execFile(
			NPM_COMMAND,
			args,
			{
				cwd: ROOT_DIR,

				timeout,

				maxBuffer:
					1024 * 1024 * 10,

				windowsHide: true,

				env: {
					...process.env,

					NPM_CONFIG_FUND: "false",
					NPM_CONFIG_AUDIT: "false"
				}
			},

			(error, stdout, stderr) => {

				if (error) {

					error.stdout = stdout;
					error.stderr = stderr;

					return reject(error);
				}

				resolve({
					stdout,
					stderr
				});
			}
		);

	});
}


// ==================================================
// PACKAGE NAME VALIDATION
// ==================================================

function validPackageName(name) {

	return /^(@[a-z0-9._-]+\/)?[a-z0-9._-]+(@[a-z0-9._-]+)?$/i.test(
		name
	);
}


// ==================================================
// CLEAN OUTPUT
// ==================================================

function cleanOutput(text) {

	if (!text) return "";

	return String(text)
		.replace(
			/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g,
			""
		)
		.trim();
}


// ==================================================
// SHORT OUTPUT
// ==================================================

function shortOutput(
	text,
	max = 1200
) {

	text =
		cleanOutput(text);

	if (
		text.length <= max
	) {
		return text;
	}

	return (
		text.slice(0, max) +
		"\n...\nتم اختصار الناتج."
	);
}


// ==================================================
// READ PACKAGE.JSON
// ==================================================

function readPackageJSON() {

	if (
		!fs.existsSync(PACKAGE_JSON)
	) {
		return null;
	}

	try {

		return fs.readJsonSync(
			PACKAGE_JSON
		);

	} catch {

		return null;
	}
}


// ==================================================
// GET INSTALLED PACKAGES
// ==================================================

function getInstalledPackages() {

	const pkg =
		readPackageJSON();

	if (!pkg) {
		return {};
	}

	return {
		...(pkg.dependencies || {}),
		...(pkg.devDependencies || {}),
		...(pkg.optionalDependencies || {})
	};
}


// ==================================================
// SAVE PACKAGE JSON
// ==================================================

function savePackageJSON(data) {

	fs.writeJsonSync(
		PACKAGE_JSON,
		data,
		{
			spaces: 2
		}
	);
}


// ==================================================
// PACKAGE TYPE
// ==================================================

function getPackageType(info) {

	if (
		info?.type === "module"
	) {
		return "ES Module";
	}

	if (
		info?.type === "commonjs"
	) {
		return "CommonJS";
	}

	return "Node.js Package";
}


// ==================================================
// DESCRIPTION TRANSLATION
// ==================================================

function translateDescription(
	description
) {

	if (!description) {
		return "لا يوجد وصف متاح.";
	}

	const text =
		String(description)
			.toLowerCase()
			.trim();

	const dictionary = {

		"javascript library":
			"مكتبة JavaScript",

		"javascript utility":
			"أداة مساعدة لـ JavaScript",

		"node.js library":
			"مكتبة لـ Node.js",

		"node.js module":
			"وحدة لـ Node.js",

		"http client":
			"عميل HTTP لإرسال واستقبال الطلبات",

		"http request library":
			"مكتبة لإرسال طلبات HTTP",

		"utility library":
			"مكتبة أدوات مساعدة",

		"command line":
			"أداة تعمل من سطر الأوامر",

		"web scraping":
			"أداة لاستخراج البيانات من صفحات الويب",

		"web framework":
			"إطار عمل لتطوير تطبيقات الويب",

		"database":
			"مكتبة للتعامل مع قواعد البيانات",

		"api":
			"مكتبة للتعامل مع واجهات API"
	};

	for (
		const key of Object.keys(dictionary)
	) {

		if (
			text.includes(key)
		) {
			return dictionary[key];
		}
	}

	// إذا لم توجد ترجمة محلية
	return description;
}


// ==================================================
// AUTO UPDATE
// ==================================================

async function autoUpdatePackages() {

	if (!AUTO_UPDATE) {
		return;
	}

	try {

		if (
			!fs.existsSync(
				PACKAGE_JSON
			)
		) {
			return;
		}

		console.log(
			"[NPM] Checking package updates..."
		);

		const result =
			await runNpm(
				[
					"update",
					"--no-audit",
					"--no-fund"
				],
				600000
			);

		console.log(
			"[NPM] Package update completed."
		);

		if (
			result.stdout
		) {

			console.log(
				shortOutput(
					result.stdout,
					2000
				)
			);
		}

	} catch (error) {

		console.error(
			"[NPM AUTO UPDATE]",
			error.message
		);
	}
}


// ==================================================
// ON LOAD
// ==================================================

module.exports.onLoad = function() {

	console.log(
		"[NPM] Library manager loaded."
	);

	// فحص وتحديث أولي بعد تشغيل البوت
	setTimeout(
		() => {
			autoUpdatePackages();
		},
		15000
	);


	// تحديث دوري
	setInterval(
		() => {

			autoUpdatePackages();

		},
		AUTO_UPDATE_INTERVAL
	);
};


// ==================================================
// COMMAND
// ==================================================

module.exports.run = async function({
	api,
	event,
	args
}) {

	const {
		threadID,
		messageID
	} = event;


	const send = message =>
		api.sendMessage(
			message,
			threadID,
			messageID
		);


	const react = emoji => {

		try {

			api.setMessageReaction(
				emoji,
				messageID,
				() => {},
				true
			);

		} catch {}
	};


	const action =
		String(
			args[0] || ""
		)
			.trim()
			.toLowerCase();


	// ==================================================
	// HELP
	// ==================================================

	if (!action) {

		return send(
			"╭─  ── ── ── ──  ─╮\n" +
			"     NPM LIBRARY MANAGER\n" +
			"╰─  ── ── ── ──  ─╯\n" +
			"⎔ npm install <package>\n" +
			"⎔ npm remove <package>\n" +
			"⎔ npm update\n" +
			"⎔ npm outdated\n" +
			"⎔ npm list\n" +
			"⎔ npm inquiry <package>\n" +
			"⎔ npm version\n" +
			"⊞ Auto Update: ON\n" +
			"⊞ Permission: Developer\n" +
			"── ── ── ── ── ── ──"
		);
	}


	// ==================================================
	// VERSION
	// ==================================================

	if (
		action === "version"
	) {

		try {

			const result =
				await runNpm([
					"--version"
				]);

			return send(
				"╭─  ── ── ── ──  ─╮\n" +
				"       NPM SYSTEM\n" +
				"╰─  ── ── ── ──  ─╯\n" +
				`⎔ NPM: ${cleanOutput(result.stdout)}\n` +
				`⎔ Node: ${process.version}\n` +
				"⊞ Status: Online\n" +
				"── ── ── ── ── ── ──"
			);

		} catch (error) {

			return send(
				"تعذر معرفة إصدار NPM.\n\n" +
				error.message
			);
		}
	}


	// ==================================================
	// LIST
	// ==================================================

	if (
		action === "list"
	) {

		const packages =
			getInstalledPackages();

		const names =
			Object.keys(packages);

		if (!names.length) {

			return send(
				"╭── ◸ PACKAGES ◿ ──╮\n" +
				"│ لا توجد مكتبات.\n" +
				"╰─────────────────╯"
			);
		}

		const list =
			names
				.slice(0, 100)
				.map(
					(name, index) =>
						`⎔ ${index + 1}. ${name} — ${packages[name]}`
				)
				.join("\n");

		return send(
			"╭─  ── ── ── ──  ─╮\n" +
			"     BOT LIBRARIES\n" +
			"╰─  ── ── ── ──  ─╯\n" +
			list +
			`\n\n⊞ Total: ${names.length}\n` +
			"── ── ── ── ── ── ──"
		);
	}


	// ==================================================
	// OUTDATED
	// ==================================================

	if (
		action === "outdated"
	) {

		react("🔎");

		try {

			const result =
				await runNpm(
					[
						"outdated",
						"--json"
					],
					120000
				);

			const data =
				JSON.parse(
					result.stdout || "{}"
				);

			const names =
				Object.keys(data);

			if (!names.length) {

				react("✅");

				return send(
					"╭── ◸ OUTDATED ◿ ──╮\n" +
					"│ ⊸ جميع المكتبات محدثة.\n" +
					"╰──────────────────╯"
				);
			}

			const list =
				names
					.slice(0, 50)
					.map(
						name => {

							const item =
								data[name];

							return (
								`⎔ ${name}\n` +
								`   Current: ${item.current}\n` +
								`   Wanted : ${item.wanted}\n` +
								`   Latest : ${item.latest}`
							);
						}
					)
					.join("\n\n");

			react("⚠️");

			return send(
				"╭─  ── ── ── ──  ─╮\n" +
				"     OUTDATED PACKAGES\n" +
				"╰─  ── ── ── ──  ─╯\n" +
				list +
				"\n\n⊞ استخدم npm update للتحديث.\n" +
				"── ── ── ── ── ── ──"
			);

		} catch (error) {

			// npm outdated يرجع exit code عندما توجد تحديثات
			if (
				error.stdout
			) {

				try {

					const data =
						JSON.parse(
							error.stdout
						);

					const names =
						Object.keys(data);

					const list =
						names
							.slice(0, 50)
							.map(
								name => {

									const item =
										data[name];

									return (
										`⎔ ${name}\n` +
										`   Current: ${item.current}\n` +
										`   Wanted : ${item.wanted}\n` +
										`   Latest : ${item.latest}`
									);
								}
							)
							.join("\n\n");

					return send(
						"╭─  ── ── ── ──  ─╮\n" +
						"     OUTDATED PACKAGES\n" +
						"╰─  ── ── ── ──  ─╯\n" +
						list +
						"\n\n⊞ استخدم npm update للتحديث.\n" +
						"── ── ── ── ── ── ──"
					);

				} catch {}
			}

			react("❌");

			return send(
				"تعذر فحص المكتبات.\n\n" +
				shortOutput(
					error.stderr ||
					error.message
				)
			);
		}
	}


	// ==================================================
	// INSTALL
	// ==================================================

	if (
		action === "install"
	) {

		const packages =
			args
				.slice(1)
				.map(
					x => String(x).trim()
				)
				.filter(Boolean);

		if (!packages.length) {

			return send(
				"╭── ◸ INSTALL ◿ ──╮\n" +
				"│ الاستخدام:\n" +
				"│ npm install <package>\n" +
				"│\n" +
				"│ مثال:\n" +
				"│ npm install axios\n" +
				"╰─────────────────╯"
			);
		}


		const invalid =
			packages.filter(
				name =>
					!validPackageName(name)
			);

		if (invalid.length) {

			return send(
				"اسم مكتبة غير صالح:\n\n" +
				invalid.join("\n")
			);
		}


		react("📦");

		try {

			const result =
				await runNpm(
					[
						"install",
						"--save",
						"--no-audit",
						"--no-fund",
						...packages
					],
					600000
				);


			react("✅");


			return send(
				"╭─  ── ── ── ──  ─╮\n" +
				"     PACKAGE INSTALL\n" +
				"╰─  ── ── ── ──  ─╯\n" +
				"⎔ Status: Installed\n" +
				`⊞ Package: ${packages.join(", ")}\n` +
				"⎔ Saved: package.json\n" +
				"⎔ Lock: package-lock.json\n" +
				"── ── ── ── ── ── ──\n\n" +
				shortOutput(
					result.stdout ||
					"Installation completed."
				)
			);

		} catch (error) {

			react("❌");

			return send(
				"╭── ◸ INSTALL ERROR ◿ ──╮\n" +
				"│ فشل تثبيت المكتبة.\n" +
				"╰───────────────────────╯\n\n" +
				shortOutput(
					error.stderr ||
					error.stdout ||
					error.message
				)
			);
		}
	}


	// ==================================================
	// REMOVE
	// ==================================================

	if (
		action === "remove"
	) {

		const packages =
			args
				.slice(1)
				.filter(Boolean);

		if (!packages.length) {

			return send(
				"الاستخدام:\n" +
				"npm remove <package>"
			);
		}


		const invalid =
			packages.filter(
				name =>
					!validPackageName(name)
			);

		if (invalid.length) {

			return send(
				"اسم مكتبة غير صالح."
			);
		}


		react("🗑️");

		try {

			const result =
				await runNpm(
					[
						"uninstall",
						...packages,
						"--no-audit",
						"--no-fund"
					],
					300000
				);

			react("✅");

			return send(
				"╭─  ── ── ── ──  ─╮\n" +
				"      PACKAGE REMOVE\n" +
				"╰─  ── ── ── ──  ─╯\n" +
				"⎔ Status: Removed\n" +
				`⊞ Package: ${packages.join(", ")}\n` +
				"── ── ── ── ── ── ──\n\n" +
				shortOutput(
					result.stdout ||
					"Removal completed."
				)
			);

		} catch (error) {

			react("❌");

			return send(
				"فشل حذف المكتبة.\n\n" +
				shortOutput(
					error.stderr ||
					error.stdout ||
					error.message
				)
			);
		}
	}


	// ==================================================
	// UPDATE
	// ==================================================

	if (
		action === "update"
	) {

		const packages =
			args
				.slice(1)
				.filter(Boolean);


		react("🔄");


		try {

			const npmArgs = [
				"update",
				"--no-audit",
				"--no-fund"
			];

			if (
				packages.length
			) {
				npmArgs.push(
					...packages
				);
			}


			const result =
				await runNpm(
					npmArgs,
					600000
				);


			react("✅");


			return send(
				"╭─  ── ── ── ──  ─╮\n" +
				"       PACKAGE UPDATE\n" +
				"╰─  ── ── ── ──  ─╯\n" +
				"⎔ Status: Updated\n" +
				`⊞ Target: ${
					packages.length
						? packages.join(", ")
						: "All packages"
				}\n` +
				"── ── ── ── ── ── ──\n\n" +
				shortOutput(
					result.stdout ||
					"Update completed."
				)
			);

		} catch (error) {

			react("❌");

			return send(
				"فشل تحديث المكتبات.\n\n" +
				shortOutput(
					error.stderr ||
					error.stdout ||
					error.message
				)
			);
		}
	}


	// ==================================================
	// INQUIRY
	// ==================================================

	if (
		action === "inquiry"
	) {

		const packageName =
			args[1];

		if (!packageName) {

			return send(
				"╭── ◸ INQUIRY ◿ ──╮\n" +
				"│ الاستخدام:\n" +
				"│ npm inquiry <package>\n" +
				"│\n" +
				"│ مثال:\n" +
				"│ npm inquiry axios\n" +
				"╰─────────────────╯"
			);
		}


		if (
			!validPackageName(
				packageName
			)
		) {

			return send(
				"اسم المكتبة غير صالح."
			);
		}


		react("🔎");


		try {

			const result =
				await runNpm(
					[
						"view",
						packageName,
						"--json"
					],
					120000
				);


			const info =
				JSON.parse(
					result.stdout
				);


			const description =
				translateDescription(
					info.description
				);


			const author =
				typeof info.author === "string"
					? info.author
					: info.author?.name ||
						"غير معروف";


			const repository =
				typeof info.repository === "string"
					? info.repository
					: info.repository?.url ||
						"غير متوفر";


			const keywords =
				Array.isArray(
					info.keywords
				)
					? info.keywords
						.slice(0, 8)
						.join(", ")
					: "غير متوفر";


			const type =
				getPackageType(
					info
				);


			react("✅");


			return send(
				"╭──── ◸ PACKAGE INQUIRY ◿ ────╮\n" +
				"│\n" +
				`│ ⎔ الاسم : ${info.name || packageName}\n` +
				`│ ⎔ النوع : ${type}\n` +
				`│ ⎔ الإصدار : ${info.version || "غير معروف"}\n` +
				`│ ⎔ المؤلف : ${author}\n` +
				`│ ⎔ الترخيص : ${info.license || "غير معروف"}\n` +
				"│\n" +
				`│ ⊞ الوصف : ${description}\n` +
				`│ ⊞ الاستخدام : ${keywords}\n` +
				"│\n" +
				`│ ⊞ Repository : ${repository}\n` +
				"│\n" +
				"╰──────────────────────────────╯"
			);

		} catch (error) {

			react("❌");

			return send(
				"╭── ◸ INQUIRY ERROR ◿ ──╮\n" +
				"│ لم يتم العثور على المكتبة.\n" +
				"╰───────────────────────╯\n\n" +
				shortOutput(
					error.stderr ||
					error.message
				)
			);
		}
	}


	// ==================================================
	// UNKNOWN COMMAND
	// ==================================================

	return send(
		"╭── ◸ NPM ◿ ──╮\n" +
		"│ أمر غير معروف.\n" +
		"│\n" +
		"│ npm install <package>\n" +
		"│ npm inquiry <package>\n" +
		"│ npm update\n" +
		"│ npm outdated\n" +
		"╰──────────────╯"
	);
};
