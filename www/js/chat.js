window.chat = {
	init: function() {
		//alert("go");
		chat.start();
		common.handle_external_links();

	},
	start: function(version) {

		var url =  localStorage.server + "/api/method/frappe.chat.website.get_chat_assets";

		$.ajax({
			method: "GET",
			url: url,
			data: {
				build_version: "000" || localStorage._build_version || "000" // TODO REMVOE DEBUG
			}
		}).success(function(data) {
			// chat startup
			window._version_number = data.message.build_version;
			if(!window.frappe) { window.frappe = {}; }
			window.frappe.boot = data.message.boot;
			window.dev_server = data.message.boot.developer_mode;

			window.frappe.ready_events = [];
			window.frappe.ready = function(fn) {
				window.frappe.ready_events.push(fn);
			};
			window.socketio_port = window.frappe.boot.socketio_port;

			if(cordova.platformId === "ios") {
				document.addEventListener("deviceready", function() {
					StatusBar.backgroundColorByHexString("#f5f7fa");
				});
			}

			if(localStorage._build_version != data.message.build_version) {
				localStorage._build_version = data.message.build_version;
				common.write_file("assets.txt", JSON.stringify(data.message.assets));
				chat.chat_assets = data.message.assets;
			}

			if(!chat.chat_assets) {
				common.read_file("assets.txt", function (assets) {
					chat.chat_assets = JSON.parse(assets);
					chat.setup_assets();
				});
			}
			else {
				chat.setup_assets();
			}

		}).error(function(e) {
			if(![403, 401].includes(parseInt(e.status))) {
				alert(`${localStorage.server} failed with status ${e.status}`);
			}
			chat.logout();
		});
	},
	setup_assets: function() {

		for(key in chat.chat_assets) {
			var asset = chat.chat_assets[key];
			if(asset.type == "js") {
				common.load_script(asset.data);
			} else {
				var css = asset.data.replace(/url['"\(]+([^'"\)]+)['"\)]+/g, function(match, p1) {
					var fixed = (p1.substr(0, 1)==="/") ? (localStorage.server + p1) : (localStorage.server + "/" + p1);
				});
				common.load_style(css);
			}
		}
		// start app
		// patch urls
		frappe.request.url = localStorage.server + "/";
		frappe.base_url = localStorage.server;
		common.base_url = localStorage.server;

		frappe.user.name = frappe.boot.user.name;
		frappe.session.user = frappe.boot.user.name;

		moment.locale("en");
		moment.user_utc_offset = moment().utcOffset();
		if(frappe.boot.timezone_info) {
			moment.tz.add(frappe.boot.timezone_info);
		}

		// start!
		frappe.chat.setup();
		frappe.chat.render();
		frappe.chat.widget.toggle();

		// override logout
        /*frappe.app.redirect_to_login = function() {
			localStorage.removeItem('session_id');
			window.location = "index.html";
		}*/
	},
	logout: function() {
		localStorage.removeItem('session_id');
		window.location = "index.html"
	}
}

$(document).ready(function() { chat.init() });
