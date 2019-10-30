window.chat = {
	init: function() {
		$.ajax({
			method: "GET",
			url: localStorage.server + "/api/method/frappe.chat.website.get_chat_assets",
			data: {
				build_version: "000" || localStorage._build_version || "000" // TODO REMOVE DEBUG
			}
		}).success(chat.handle_success).error(chat.handle_error);

		chat.handle_logout();
		common.handle_external_links();
	},

	handle_success: function(data) {
		if(cordova.platformId === "ios") {
			document.addEventListener("deviceready", function() {
				StatusBar.backgroundColorByHexString("#f5f7fa");
			});
		}

		// environment
		if(!window.frappe) {
			window.frappe = {};
		}
		window.frappe.boot = data.message.boot;
		window.dev_server = data.message.boot.developer_mode;
		window.socketio_port = window.frappe.boot.socketio_port;

		chat.setup_assets(data, chat.start);
	},

	handle_error: function(e) {
		if(![403, 401].includes(parseInt(e.status))) {
			alert(`${localStorage.server} failed with status ${e.status}`);
		}
		chat.logout();
	},

	start: function() {
		// patch logout
		if (!frappe.app) {
			frappe.app = {};
		}
		frappe.app.redirect_to_login = chat.logout;
		frappe.app.handle_session_expired = chat.logout;

		// patch urls
		frappe.request.url = localStorage.server + "/";
		frappe.base_url = localStorage.server;
		common.base_url = localStorage.server;

		// user name
		frappe.user.name = frappe.boot.user.name;
		frappe.session.user = frappe.boot.user.name;

		// time format
		moment.locale("en");
		moment.user_utc_offset = moment().utcOffset();
		if(frappe.boot.timezone_info) {
			moment.tz.add(frappe.boot.timezone_info);
		}

		// start!
		frappe.socketio.init(window.socketio_port);
		frappe.chat.setup();
		frappe.chat.render();
		frappe.chat.widget.toggle();
	},

	setup_assets: function(data, callback) {
		if(localStorage._build_version !== data.message.build_version) {
			localStorage._build_version = data.message.build_version;
			common.write_file("assets.txt", JSON.stringify(data.message.assets));
			chat.chat_assets = data.message.assets;
		}

		if(!chat.chat_assets) {
			common.read_file("assets.txt", function (assets) {
				chat.chat_assets = JSON.parse(assets);
				chat.load_assets();
				callback();
			});
		} else {
			chat.load_assets();
			callback();
		}
	},

	load_assets: function() {
		for(key in chat.chat_assets) {
			var asset = chat.chat_assets[key];
			if(asset.type === "js") {
				common.load_script(asset.data);
			} else {
				var css = asset.data.replace(/url['"\(]+([^'"\)]+)['"\)]+/g, function(match, p1) {
					var fixed = (p1.substr(0, 1)==="/") ? (localStorage.server + p1) : (localStorage.server + "/" + p1);
				});
				common.load_style(css);
			}
		}
	},

	logout: function() {
		localStorage.removeItem('session_id');
		window.location = "index.html";
	},

	handle_logout: function () {
		$(document.body).on('click', '.frappe-chat-close', function() {
			chat.logout();
		});
	}
};

$(document).ready(function() {
	chat.init();
});
