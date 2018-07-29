try {
    if (!Range.prototype.hasOwnProperty("intersectsNode")) {
        Range.prototype["intersectsNode"] = function (node) {
            let range = document.createRange();
            range.selectNode(node);
            return 0 > this.compareBoundaryPoints(Range.END_TO_START, range)
                && 0 < this.compareBoundaryPoints(Range.START_TO_END, range);
        };
    }
}
catch (e) { }
try {
    if (!Navigator.prototype.hasOwnProperty("languages")) {
        Navigator.prototype["languages"] = [navigator.language];
    }
}
catch (e) { }
var getExtensionProtocol = function () {
    if (typeof browser == "undefined") {
        if (typeof chrome !== "undefined")
            return "chrome-extension://";
    }
    else {
        return "ms-browser-extension://";
    }
};
class BridgeAlarmEvent {
    constructor() {
        this.listeners = new Array();
    }
    addListener(callback) {
        this.listeners.push(callback);
    }
    addRules(rules, callback) { }
    getRules(ruleIdentifiers, callback) { }
    hasListener(callback) { return false; }
    hasListeners() { return this.listeners.length > 0; }
    removeRules(ruleIdentifiers, callback) { }
    removeListener(callback) { }
}
class EdgeBridgeAlarms {
    constructor() {
        this.alarms = {};
        this.onAlarm = new BridgeAlarmEvent();
    }
    create(name, alarmInfo) {
        if (arguments.length < 1 || arguments.length > 2) {
            throw "Unexpected set of arguments. Expecting (alarmInfo) or (name, alarmInfo)";
        }
        var alarmName = "";
        var startMilliseconds = 0;
        var startSet = false;
        if (typeof name === "string") {
            alarmName = name;
        }
        else if (typeof name === "object") {
            alarmInfo = name;
        }
        else
            throw "Unexpected set of arguments. Expecting (alarmInfo) or (name, alarmInfo)";
        if (!alarmInfo) {
            throw "You must specify an alarmInfo argument!!";
        }
        if (!alarmInfo.when && !alarmInfo.delayInMinutes && !alarmInfo.periodInMinutes) {
            throw "Invalid alarmInfo argument!!";
        }
        else if (alarmInfo.when && alarmInfo.delayInMinutes) {
            throw "Invalid alarmInfo argument!! Either 'when' or 'delayInMinutes' but not both!!";
        }
        else if (alarmInfo.when) {
            startMilliseconds = alarmInfo.when;
            startSet = true;
        }
        else if (alarmInfo.delayInMinutes) {
            startMilliseconds = alarmInfo.delayInMinutes * 60 * 1000;
            startSet = true;
        }
        else if (alarmInfo.periodInMinutes) {
            startMilliseconds = alarmInfo.periodInMinutes * 60 * 1000;
            startSet = true;
        }
        else
            throw "Invalid alarmInfo argument!!";
        var timerHandle;
        if (startSet) {
            if (this.alarms[alarmName]) {
                this.clearAlarm(alarmName);
            }
            var alarm = { name: alarmName, scheduledTime: Date.now() + startMilliseconds };
            var alarmAndHandle = { alarm: alarm, timerHandle: 0, startedInterval: false };
            this.alarms[alarmName] = alarmAndHandle;
            if (alarmInfo.periodInMinutes) {
                this.alarms[alarmName].alarm.periodInMinutes = alarmInfo.periodInMinutes;
                this.alarms[alarmName].timerHandle = window.setTimeout(function (alarmName, that) {
                    that.soundAlarm(alarmName, that);
                    that.alarms[alarmName].timerHandle = window.setInterval(that.soundAlarm, alarmInfo.periodInMinutes * 60 * 1000, alarmName, that);
                    that.alarms[alarmName].startedInterval = true;
                }, startMilliseconds, alarmName, this);
            }
            else {
                this.alarms[alarmName].timerHandle = window.setTimeout(this.soundAlarm, startMilliseconds, alarmName, this);
            }
        }
    }
    getAll(callback) {
        for (var key in this.alarms) {
            if (this.alarms.hasOwnProperty(key)) {
                var alarm = this.alarms[key].alarm;
                callback(alarm);
            }
        }
    }
    clearAll(callback) {
        var clearedAll = true;
        for (var key in this.alarms) {
            if (this.alarms.hasOwnProperty(key)) {
                var alarm = this.alarms[key].alarm;
                if (!this.clearAlarm(alarm.name)) {
                    clearedAll = false;
                }
            }
        }
        if (callback) {
            callback(clearedAll);
        }
    }
    clear(name, callback) {
        var alarmName = "";
        if (typeof name === "string") {
            alarmName = name;
        }
        else if (typeof name === "function") {
            callback = name;
        }
        var wasCleared = this.clearAlarm(alarmName);
        if (callback) {
            callback(wasCleared);
        }
    }
    get(name, callback) {
        if (this.alarms.hasOwnProperty(name)) {
            var alarm = this.alarms[name].alarm;
            callback(alarm);
        }
    }
    clearAlarm(name) {
        var wasCleared = false;
        if (this.alarms[name]) {
            if (this.alarms[name].alarm.startedInterval) {
                window.clearInterval(this.alarms[name].timerHandle);
            }
            else {
                window.clearTimeout(this.alarms[name].timerHandle);
            }
            delete this.alarms[name];
            wasCleared = true;
        }
        return wasCleared;
    }
    soundAlarm(name, that) {
        for (var index = 0; index < that.onAlarm.listeners.length; index++) {
            var listener = that.onAlarm.listeners[index];
            listener({ name: name });
        }
    }
}
class FakeEvent {
    addListener(callback) { }
    addRules(rules, callback) { }
    getRules(ruleIdentifiers, callback) { }
    hasListener(callback) { return false; }
    hasListeners() { return false; }
    removeRules(ruleIdentifiers, callback) { }
    removeListener(callback) { }
}
class EdgeBridgeHelper {
    constructor() {
        this.fakeEvent = new FakeEvent();
        this.alarms = new EdgeBridgeAlarms();
    }
    toAbsolutePath(relativePath) {
        if (relativePath.indexOf("ms-browser-extension://") == 0) {
            return relativePath.replace(myBrowser.runtime.getURL(""), "");
        }
        else if (relativePath.indexOf("/") != 0) {
            var absolutePath = "";
            var documentPath = document.location.pathname;
            absolutePath = documentPath.substring(0, documentPath.lastIndexOf("/") + 1);
            absolutePath += relativePath;
            return absolutePath;
        }
        return relativePath;
    }
}
var bridgeHelper = new EdgeBridgeHelper();
class EdgeBridgeDebugLog {
    constructor() {
        this.CatchOnException = true;
        this.VerboseLogging = true;
        this.FailedCalls = {};
        this.SuccededCalls = {};
        this.DeprecatedCalls = {};
        this.BridgedCalls = {};
        this.UnavailableApis = {};
        this.EdgeIssues = {};
    }
    log(message) {
        try {
            if (this.VerboseLogging) {
                console.log(message);
            }
        }
        catch (e) {
        }
    }
    info(message) {
        try {
            if (this.VerboseLogging) {
                console.info(message);
            }
        }
        catch (e) {
        }
    }
    warn(message) {
        try {
            if (this.VerboseLogging) {
                console.warn(message);
            }
        }
        catch (e) {
        }
    }
    error(message) {
        try {
            if (this.VerboseLogging) {
                console.error(message);
            }
        }
        catch (e) {
        }
    }
    DoActionAndLog(action, name, deprecatedTo, bridgedTo) {
        var result;
        try {
            result = action();
            this.AddToCalledDictionary(this.SuccededCalls, name);
            if (typeof deprecatedTo !== "undefined") {
                this.warn("API Call Deprecated - Name: " + name + ", Please use " + deprecatedTo + " instead!");
                this.AddToCalledDictionary(this.DeprecatedCalls, name);
            }
            if (typeof bridgedTo !== "undefined") {
                this.info("API Call '" + name + "' has been bridged to another Edge API: " + bridgedTo);
                this.AddToCalledDictionary(this.BridgedCalls, name);
            }
            this.info("API Call: '" + name + "'");
            return result;
        }
        catch (ex) {
            this.AddToCalledDictionary(this.FailedCalls, name);
            if (this.CatchOnException)
                this.error("API Call Failed: " + name + " - " + ex);
            else
                throw ex;
        }
    }
    LogEdgeIssue(name, message) {
        this.warn(message);
        this.AddToCalledDictionary(this.EdgeIssues, name);
    }
    LogUnavailbleApi(name, deprecatedTo) {
        this.warn("API Call '" + name + "' is not supported in Edge");
        this.AddToCalledDictionary(this.UnavailableApis, name);
        if (typeof deprecatedTo !== "undefined") {
            this.warn("API Call Deprecated - Name: " + name + ", Please use " + deprecatedTo + " instead!");
            this.AddToCalledDictionary(this.DeprecatedCalls, name);
        }
    }
    AddToCalledDictionary(dictionary, name) {
        if (typeof dictionary[name] !== "undefined") {
            dictionary[name]++;
        }
        else {
            dictionary[name] = 1;
        }
    }
}
var bridgeLog = new EdgeBridgeDebugLog();
class EdgeExtensionBridge {
    get inIncognitoContext() {
        return bridgeLog.DoActionAndLog(() => {
            return myBrowser.extension.inIncognitoContext;
        }, "extension.inIncognitoContext");
    }
    getBackgroundPage() {
        return bridgeLog.DoActionAndLog(() => {
            return myBrowser.extension.getBackgroundPage.apply(null, arguments);
        }, "extension.getBackgroundPage");
    }
    getURL(path) {
        return bridgeLog.DoActionAndLog(() => {
            return myBrowser.extension.getURL.apply(null, arguments);
        }, "extension.getURL");
    }
    getViews(fetchProperties) {
        return bridgeLog.DoActionAndLog(() => {
            return myBrowser.extension.getViews.apply(null, arguments);
        }, "extension.getViews");
    }
    isAllowedIncognitoAccess(callback) {
        return bridgeLog.DoActionAndLog(() => {
            return myBrowser.extension.isAllowedIncognitoAccess.apply(null, arguments);
        }, "extension.isAllowedIncognitoAccess");
    }
}
class EdgeChromeExtensionBridge extends EdgeExtensionBridge {
    get onConnect() { return bridgeLog.DoActionAndLog(() => { return EdgeRuntimeBridge.prototype.onConnect; }, "extension.onConnect", "runtime.onConnect", "runtime.onConnect"); }
    get onMessage() { return bridgeLog.DoActionAndLog(() => { return myBrowser.runtime.onMessage; }, "extension.onMessage", "runtime.onMessage", "runtime.onMessage"); }
    get onRequest() { return bridgeLog.DoActionAndLog(() => { return myBrowser.runtime.onMessage; }, "extension.onRequest", "runtime.onMessage", "runtime.onMessage"); }
    get onRequestExternal() { return bridgeLog.DoActionAndLog(() => { return myBrowser.runtime.onMessageExternal; }, "extension.onRequestExternal", "runtime.onMessageExternal", "runtime.onMessageExternal"); }
    get lastError() { return bridgeLog.DoActionAndLog(() => { return myBrowser.runtime.lastError; }, "extension.lastError", undefined, "runtime.lastError"); }
    connect(extensionId, connectInfo) {
        return bridgeLog.DoActionAndLog(() => {
            return EdgeRuntimeBridge.prototype.connect.apply(null, arguments);
        }, "extension.connect", "runtime.connect", "runtime.connect");
    }
    sendMessage(message, responseCallback) {
        return bridgeLog.DoActionAndLog(() => {
            return EdgeRuntimeBridge.prototype.sendMessage.apply(null, arguments);
        }, "extension.sendMessage", "runtime.sendMessage", "runtime.sendMessage");
    }
    sendRequest(extensionId, message, options, responseCallback) {
        return bridgeLog.DoActionAndLog(() => {
            return EdgeRuntimeBridge.prototype.sendMessage.apply(null, arguments);
        }, "extension.sendRequest", "runtime.sendMessage", "runtime.sendMessage");
    }
    isAllowedFileSchemeAccess(callback) {
        bridgeLog.LogUnavailbleApi("extension.isAllowedFileSchemeAccess");
    }
    setUpdateUrlData(data) {
        bridgeLog.LogUnavailbleApi("extension.setUpdateUrlData");
    }
}
class EdgeI18nBridge {
    getAcceptLanguages(callback) {
        return bridgeLog.DoActionAndLog(() => {
            return myBrowser.i18n.getAcceptLanguages.apply(null, arguments);
        }, "i18n.getAcceptLanguages");
    }
    getMessage(messageName, substitutions) {
        return bridgeLog.DoActionAndLog(() => {
            if (messageName.indexOf("@@extension_id") > -1) {
                return myBrowser.runtime.id;
            }
            return myBrowser.i18n.getMessage.apply(null, arguments);
        }, "i18n.getMessage");
    }
    getUILanguage() {
        return bridgeLog.DoActionAndLog(() => {
            return myBrowser.i18n.getUILanguage.apply(null, arguments);
        }, "i18n.getUILanguage");
    }
}
class EdgeRuntimeBridge {
    get id() { return bridgeLog.DoActionAndLog(() => { return myBrowser.runtime.id; }, "runtime.id"); }
    get lastError() { return bridgeLog.DoActionAndLog(() => { return myBrowser.runtime.lastError; }, "runtime.lastError"); }
    get onConnect() { return bridgeLog.DoActionAndLog(() => { return myBrowser.runtime.onConnect; }, "runtime.onConnect"); }
    get onInstalled() { return bridgeLog.DoActionAndLog(() => { return myBrowser.runtime.onInstalled; }, "runtime.onInstalled"); }
    get onMessage() { return bridgeLog.DoActionAndLog(() => { return myBrowser.runtime.onMessage; }, "runtime.onMessage"); }
    get onMessageExternal() { return bridgeLog.DoActionAndLog(() => { return myBrowser.runtime.onMessageExternal; }, "runtime.onMessageExternal"); }
    connect(extensionId, connectInfo) {
        return bridgeLog.DoActionAndLog(() => {
            return myBrowser.runtime.connect.apply(null, arguments);
        }, "runtime.connect");
    }
    connectNative(application) {
        return bridgeLog.DoActionAndLog(() => {
            return myBrowser.runtime.connectNative.apply(null, arguments);
        }, "runtime.connectNative");
    }
    getBackgroundPage(callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.runtime.getBackgroundPage.apply(null, arguments);
        }, "runtime.getBackgroundPage");
    }
    getManifest() {
        return bridgeLog.DoActionAndLog(() => {
            return myBrowser.runtime.getManifest.apply(null, arguments);
        }, "runtime.getManifest");
    }
    getURL(path) {
        return bridgeLog.DoActionAndLog(() => {
            return myBrowser.runtime.getURL.apply(null, arguments);
        }, "runtime.getURL");
    }
    reload() {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.runtime.reload.apply(null, arguments);
        }, "runtime.reload");
    }
    sendMessage(extensionId, message, options, responseCallback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.runtime.sendMessage.apply(null, arguments);
        }, "runtime.sendMessage");
    }
    sendNativeMessage(application, message, responseCallback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.runtime.sendNativeMessage.apply(null, arguments);
        }, "runtime.sendNativeMessage");
    }
    setUninstallURL(url, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.runtime.setUninstallURL.apply(null, arguments);
        }, "runtime.setUninstallURL");
    }
}
class EdgeChromeRuntimeBridge extends EdgeRuntimeBridge {
    get onConnectExternal() { bridgeLog.LogUnavailbleApi("runtime.onConnectExternal"); return bridgeHelper.fakeEvent; }
    get onRestartRequired() { bridgeLog.LogUnavailbleApi("runtime.onRestartRequired"); return bridgeHelper.fakeEvent; }
    get onSuspend() { bridgeLog.LogUnavailbleApi("runtime.onSuspend"); return bridgeHelper.fakeEvent; }
    get onSuspendCanceled() { bridgeLog.LogUnavailbleApi("runtime.onSuspendCanceled"); return bridgeHelper.fakeEvent; }
    get onUpdateAvailable() { bridgeLog.LogUnavailbleApi("runtime.onUpdateAvailable"); return bridgeHelper.fakeEvent; }
    get onStartup() { return bridgeLog.DoActionAndLog(() => { return myBrowser.windows.onCreated; }, "runtime.onStartup", undefined, "windows.onCreated"); }
    openOptionsPage(callback) {
        bridgeLog.DoActionAndLog(() => {
            var optionsPage = myBrowser.runtime.getManifest()["options_page"];
            var optionsPageUrl = myBrowser.runtime.getURL(optionsPage);
            if (typeof callback !== "undefined") {
                myBrowser.tabs.create({ url: optionsPageUrl }, callback);
            }
            else {
                myBrowser.tabs.create({ url: optionsPageUrl });
            }
        }, "runtime.openOptionsPage", undefined, "tabs.create({ url: optionsPageUrl })");
    }
    setUninstallURL(url, callback) {
        if (myBrowser.runtime.setUninstallURL) {
            EdgeRuntimeBridge.prototype.setUninstallURL.apply(null, arguments);
        }
        else {
            bridgeLog.LogUnavailbleApi("runtime.setUninstallURL");
        }
    }
    getPackageDirectoryEntry(callback) {
        bridgeLog.LogUnavailbleApi("runtime.getPackageDirectoryEntry");
    }
    getPlatformInfo(callback) {
        bridgeLog.LogUnavailbleApi("runtime.getPlatformInfo");
    }
    requestUpdateCheck(callback) {
        bridgeLog.LogUnavailbleApi("runtime.requestUpdateCheck");
    }
    restart() {
        bridgeLog.LogUnavailbleApi("runtime.restart");
    }
}
class EdgeStorageBridge {
    get local() { return bridgeLog.DoActionAndLog(() => { return myBrowser.storage.local; }, "storage.local"); }
    get sync() { return bridgeLog.DoActionAndLog(() => { return myBrowser.storage.sync; }, "storage.sync"); }
    get onChanged() { return bridgeLog.DoActionAndLog(() => { return myBrowser.storage.onChanged; }, "storage.onChanged"); }
}
class EdgeChromeStorageBridge extends EdgeStorageBridge {
    get sync() {
        if (myBrowser.storage.sync) {
            return EdgeStorageBridge.prototype.sync;
        }
        else {
            return bridgeLog.DoActionAndLog(() => {
                return myBrowser.storage.local;
            }, "storage.sync", undefined, "storage.local");
        }
    }
    get managed() { return bridgeLog.DoActionAndLog(() => { return myBrowser.storage.local; }, "storage.managed", undefined, "storage.local"); }
}
class EdgeContentBridge {
    constructor() {
        this.extension = typeof browser.extension !== "undefined" ? new EdgeChromeExtensionBridge() : undefined;
        this.i18n = typeof browser.i18n !== "undefined" ? new EdgeI18nBridge() : undefined;
        this.runtime = typeof browser.runtime !== "undefined" ? new EdgeChromeRuntimeBridge() : undefined;
        this.storage = typeof browser.storage !== "undefined" ? new EdgeChromeStorageBridge() : undefined;
    }
}
var myBrowser = browser;
var chrome = new EdgeContentBridge();
