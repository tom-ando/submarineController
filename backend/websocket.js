// Imports
var fs = require("fs");
var shelljs = require("shelljs");
var ws = require("ws");
var wifi = require("node-wifi");

var devMode = require("./devMode.js");
var control = require("./control.js");
var globals = require("./globals.js");

// Starts the server
function initServer(webserver) {
    // Make the websocket server
    console.log(" [+] Starting the websocket server\n");
    let server = new ws.Server({server: webserver});

    // Event listener for when somthing connects to the server
    server.on("connection", function(newClient) {
        connection(newClient);
    });
}

// Run on every new connection
function connection(newClient) {
    console.log("    [+] Websocket connection");
    globals.client = newClient;
    // Event listener for when there's data sent
    newClient.on("message", function(message) {
        incomingMessage(message, newClient);
    });
}

// Run on every incoming message
function incomingMessage(message, client) {
    console.log("        [+] Message received from client\n");
    message = JSON.parse(message);
    switch (message[0]) {
        case "shutdown":
            shutdown();
            break;
        case "update":
            update();
            break;
        case "getWiFiNetwork":
            wifiDetails();
            break;
        case "changeWifi":
            changeWifi();
            break;
        case "connect":
            control.connect();
            break;
        case "joystickUpdate":
            control.joystickUpdate(message[1]);
        default:
            console.log("            [!] Unknown command " + message);
            break;
    }
}

/*
    Websocket commands
*/
// Command to shut down the controller
function shutdown() {
    // If not developer, shutdown the server
    if (!devMode()) {
        console.log("\n[+] Shutting down the controller");
        shelljs.exec("sudo shutdown now");
    } else {
        console.log("\n[+] Terminating program");
        process.exit();
    }
}

// Command to update the controller
function update() {
    console.log("[+] Updating software");
    if (!devMode()) {
        shelljs.exec("git pull", {silent: true}, function(code, stdout, stderr) {
            // Pulled successfully
            if (code == 0) {
                globals.client.send(JSON.stringify(["updateComplete"]));
                console.log("[+] Update complete. Rebooting\n");
                shelljs.exec("sudo reboot now", {silent: true});
            } else {
                // Something went wrong
                globals.client.send(JSON.stringify(["updateFailed"]));
                console.log("[!] Update failed");

                // Print out the error line by line
                for (line of stderr.split("\n")) {
                    if (line != "") {
                        console.log("    [!] " + line);
                    }
                }
                console.log("\n");
            }
        });
    } else {
        console.log("    [+] Devmode, not updating or restarting");
        globals.client.send(JSON.stringify(["updateComplete"]));
    }
}

// Command to fetch the wifi details
function wifiDetails() {
    console.log("[+] Getting WiFi network details");
    shelljs.exec("iwgetid -r", {silent: true}, function(code, stdout) {
        globals.client.send(JSON.stringify(["wifiNetwork", stdout]));
    });
}

function changeWifi() {
    console.log("[+] Scanning for USB");

    shelljs.exec("lsblk", {silent: true}, function(code, stdout) {
        // If developer computer then the disk isn't sda
        let volumeRegex = devMode() ? /sd[^a]\d?\s+\d+:\d+\s+\d+\s+\d+(?:\.\d+)?[GM]\s+\d+\s+part\s+([\w\d\/\-]+)/ : /sda\d?\s+\d+:\d+\s+\d+\s+\d+(?:\.\d+)?[GM]\s+\d+\s+part\s+([\w\d\/\-]+)/;
        let mountPath;
        // Run the regex to get the mount path
        try {
            mountPath = stdout.match(volumeRegex)[1];
        } catch (err) {
            // USB isn't detected
            console.log("    [!] USB not detected")
            globals.client.send(JSON.stringify(["changeWifiFail", "No USB detected"]));
            return;
        }

        console.log("    [+] USB mounted at " + mountPath);

        // Open the file and read the contents
        fs.readFile(mountPath + "/wifi.txt", "utf-8", function(err, data) {
            // The file couldn't be opened
            if (err) {
                console.log("    [!] wifi.txt not found");
                globals.client.send(JSON.stringify(["changeWifiFail", "wifi.txt not found"]));
                return;
            }

            // The file could be opened
            data = data.split("\n");
            let ssid = data[0];
            let psk = data[1];

            if (devMode()) {
                console.log("    [?] New SSID: " + ssid);
                console.log("    [?] New PSK: " + psk);
                client.send(JSON.stringify(["changeWifiSuccess"]));
            } else {
                console.log("    [+] Connecting to new WiFi network");
                // Initialise the wifi interface
                wifi.init({iface: null});
                wifi.connect({ssid: ssid, password: psk}, function(err) {
                    if (err) {
                        // Error object is very weird
                        console.log("    [!] Error connecting to WiFi network")
                        client.send(JSON.stringify(["changeWifiFail", "Ensure credentials are correct and in range"]));
                    } else {
                        console.log("    [+] Successfully connected to " + ssid);
                        client.send(JSON.stringify(["changeWifiSuccess"]));
                    }
                })
            }
        });
    });
}

// Export all the functions
module.exports.initServer = initServer;
module.exports.connection = connection;
