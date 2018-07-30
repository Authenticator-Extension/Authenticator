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
class EdgeChromeAlarmBridge {
    get onAlarm() {
        return bridgeLog.DoActionAndLog(() => {
            return bridgeHelper.alarms.onAlarm;
        }, "alarms.onAlarm", undefined, "bridgeHelper.alarms.onAlarm");
    }
    create(name, alarmInfo) {
        bridgeLog.DoActionAndLog(() => {
            bridgeHelper.alarms.create.apply(null, arguments);
        }, "alarms.create", undefined, "bridgeHelper.alarms.create");
    }
    getAll(callback) {
        bridgeLog.DoActionAndLog(() => {
            bridgeHelper.alarms.getAll.apply(null, arguments);
        }, "alarms.getAll", undefined, "bridgeHelper.alarms.getAll");
    }
    clearAll(callback) {
        bridgeLog.DoActionAndLog(() => {
            bridgeHelper.alarms.clearAll.apply(null, arguments);
        }, "alarms.clearAll", undefined, "bridgeHelper.alarms.clearAll");
    }
    clear(name, callback) {
        bridgeLog.DoActionAndLog(() => {
            bridgeHelper.alarms.clear.apply(null, arguments);
        }, "alarms.clear", undefined, "bridgeHelper.alarms.clear");
    }
    get(name, callback) {
        bridgeLog.DoActionAndLog(() => {
            bridgeHelper.alarms.get.apply(null, arguments);
        }, "alarms.get", undefined, "bridgeHelper.alarms.get");
    }
}
class EdgeChromeAppBridge {
    getDetails() {
        return bridgeLog.DoActionAndLog(() => {
            return EdgeChromeRuntimeBridge.prototype.getManifest.apply(null, arguments);
        }, "app.getManifest", undefined, "runtime.getManifest");
    }
    get isInstalled() { return bridgeLog.DoActionAndLog(() => { throw "app.isInstalled is not available in Edge"; }, "app.isInstalled"); }
    getIsInstalled() { return bridgeLog.DoActionAndLog(() => { throw "app.getIsInstalled is not available in the Edge"; }, "app.getIsInstalled"); }
    installState() { return bridgeLog.DoActionAndLog(() => { throw "app.installState is not available in Edge"; }, "app.installState"); }
    runningState() { return bridgeLog.DoActionAndLog(() => { throw "app.runningState is not available in Edge"; }, "app.runningState"); }
}
class EdgeBookmarksBridge {
    create(bookmark, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.bookmarks.create.apply(null, arguments);
        }, "bookmarks.create");
    }
    getTree(callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.bookmarks.getTree.apply(null, arguments);
        }, "bookmarks.getTree");
    }
    move(id, destination, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.bookmarks.move.apply(null, arguments);
        }, "bookmarks.move");
    }
    remove(id, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.bookmarks.remove.apply(null, arguments);
        }, "bookmarks.remove");
    }
    removeTree(id, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.bookmarks.removeTree.apply(null, arguments);
        }, "bookmarks.removeTree");
    }
    update(id, changes, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.bookmarks.update.apply(null, arguments);
        }, "bookmarks.update");
    }
}
class EdgeChromeBookmarksBridge extends EdgeBookmarksBridge {
    get onRemoved() { bridgeLog.LogUnavailbleApi("bookmarks.onRemoved"); return bridgeHelper.fakeEvent; }
    get onImportEnded() { bridgeLog.LogUnavailbleApi("bookmarks.onImportEnded"); return bridgeHelper.fakeEvent; }
    get onImportBegan() { bridgeLog.LogUnavailbleApi("bookmarks.onImportBegan"); return bridgeHelper.fakeEvent; }
    get onChanged() { bridgeLog.LogUnavailbleApi("bookmarks.onChanged"); return bridgeHelper.fakeEvent; }
    get onMoved() { bridgeLog.LogUnavailbleApi("bookmarks.onMoved"); return bridgeHelper.fakeEvent; }
    get onCreated() { bridgeLog.LogUnavailbleApi("bookmarks.onCreated"); return bridgeHelper.fakeEvent; }
    get onChildrenReordered() { bridgeLog.LogUnavailbleApi("bookmarks.onChildrenReordered"); return bridgeHelper.fakeEvent; }
    getRecent(numberOfItems, callback) {
        bridgeLog.LogUnavailbleApi("bookmarks.getRecent");
    }
    get(idList, callback) {
        bridgeLog.LogUnavailbleApi("bookmarks.get");
    }
    getChildren(id, callback) {
        bridgeLog.LogUnavailbleApi("bookmarks.getChildren");
    }
    getSubTree(id, callback) {
        bridgeLog.LogUnavailbleApi("bookmarks.getSubTree");
    }
    search(query, callback) {
        bridgeLog.LogUnavailbleApi("bookmarks.search");
    }
}
class EdgeBrowserActionBridge {
    get onClicked() { return bridgeLog.DoActionAndLog(() => { return myBrowser.browserAction.onClicked; }, "browserAction.onClicked"); }
    disable(tabId) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.browserAction.disable.apply(null, arguments);
        }, "browserAction.disable");
    }
    enable(tabId) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.browserAction.enable.apply(null, arguments);
        }, "browserAction.Enable");
    }
    getBadgeBackgroundColor(details, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.browserAction.getBadgeBackgroundColor.apply(null, arguments);
        }, "browserAction.getBadgeBackgroundColor");
    }
    getBadgeText(details, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.browserAction.getBadgeText.apply(null, arguments);
            ;
        }, "browserAction.getBadgeText");
    }
    getPopup(details, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.browserAction.getPopup.apply(null, arguments);
        }, "browserAction.getPopup");
    }
    getTitle(details, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.browserAction.getTitle.apply(null, arguments);
        }, "browserAction.getTitle");
    }
    setBadgeBackgroundColor(details) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.browserAction.setBadgeBackgroundColor.apply(null, arguments);
        }, "browserAction.setBadgeBackgroundColor");
    }
    setBadgeText(details) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.browserAction.setBadgeText.apply(null, arguments);
        }, "browserAction.setBadgeText");
    }
    setIcon(details, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.browserAction.setIcon.apply(null, arguments);
        }, "browserAction.setIcon");
    }
    setPopup(details) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.browserAction.setPopup.apply(null, arguments);
        }, "browserAction.setPopup");
    }
    setTitle(details) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.browserAction.setTitle.apply(null, arguments);
        }, "browserAction.setTitle");
    }
}
class EdgeChromeBrowserActionBridge extends EdgeBrowserActionBridge {
    getPopup(details, callback) {
        if (myBrowser.browserAction.getPopup) {
            EdgeBrowserActionBridge.prototype.getPopup.apply(null, arguments);
        }
        else {
            bridgeLog.LogUnavailbleApi("browserAction.getPopup");
        }
    }
    getTitle(details, callback) {
        if (myBrowser.browserAction.getTitle) {
            EdgeBrowserActionBridge.prototype.getTitle.apply(null, arguments);
        }
        else {
            bridgeLog.LogUnavailbleApi("browserAction.getTitle");
        }
    }
    setTitle(details) {
        if (myBrowser.browserAction.setTitle) {
            EdgeBrowserActionBridge.prototype.setTitle.apply(null, arguments);
        }
        else {
            bridgeLog.LogUnavailbleApi("browserAction.setTitle");
        }
    }
}
class EdgeChromeCommandsBridge {
    get onCommand() { bridgeLog.LogUnavailbleApi("commands.onCommand"); return bridgeHelper.fakeEvent; }
    getAll(callback) {
        bridgeLog.LogUnavailbleApi("commands.getAll");
    }
}
class EdgeContextMenusBridge {
    get ACTION_MENU_TOP_LEVEL_LIMIT() { return bridgeLog.DoActionAndLog(() => { return myBrowser.contextMenus.ACTION_MENU_TOP_LEVEL_LIMIT; }, "contextMenus.ACTION_MENU_TOP_LEVEL_LIMIT"); }
    get onClicked() { return bridgeLog.DoActionAndLog(() => { return myBrowser.contextMenus.onClicked; }, "contextMenus.onClicked"); }
    create(createProperties, callback) {
        return bridgeLog.DoActionAndLog(() => {
            return myBrowser.contextMenus.create.apply(null, arguments);
        }, "contextMenus.create");
    }
    remove(menuItemId, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.contextMenus.remove.apply(null, arguments);
        }, "contextMenus.remove");
    }
    removeAll(callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.contextMenus.removeAll.apply(null, arguments);
        }, "contextMenus.removeAll");
    }
    update(id, updateProperties, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.contextMenus.update.apply(null, arguments);
        }, "contextMenus.update");
    }
}
class EdgeCookiesBridge {
    get(details, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.cookies.get.apply(null, arguments);
        }, "cookies.get");
    }
    getAll(details, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.cookies.getAll.apply(null, arguments);
        }, "cookies.getAll");
    }
    remove(details, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.cookies.remove.apply(null, arguments);
        }, "cookies.remove");
    }
    set(details, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.cookies.set.apply(null, arguments);
        }, "cookies.set");
    }
}
class EdgeChromeCookiesBridge extends EdgeCookiesBridge {
    get onChanged() { bridgeLog.LogUnavailbleApi("cookies.onChanged"); return bridgeHelper.fakeEvent; }
}
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
class EdgeHistoryBridge {
    get onVisited() { bridgeLog.LogUnavailbleApi("history.onVisited"); return bridgeHelper.fakeEvent; }
    get onVisitRemoved() { bridgeLog.LogUnavailbleApi("history.onVisitRemoved"); return bridgeHelper.fakeEvent; }
    addUrl(details, callback) {
        bridgeLog.LogUnavailbleApi("history.addUrl");
    }
    deleteAll(callback) {
        bridgeLog.LogUnavailbleApi("history.deleteAll");
    }
    deleteRange(range, callback) {
        bridgeLog.LogUnavailbleApi("history.deleteRange");
    }
    deleteUrl(details, callback) {
        bridgeLog.LogUnavailbleApi("history.deleteUrl");
    }
    getVisits(details, callback) {
        bridgeLog.LogUnavailbleApi("history.getVisits");
    }
    search(query, callback) {
        bridgeLog.LogUnavailbleApi("history.search");
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
class EdgeChromeIdleBridge {
    get onStateChanged() { bridgeLog.LogUnavailbleApi("idle.onStateChanged"); return bridgeHelper.fakeEvent; }
    queryState(detectionIntervalInSeconds, callback) {
        bridgeLog.LogUnavailbleApi("idle.queryState");
    }
    setDetectionInterval(intervalInSeconds) {
        bridgeLog.LogUnavailbleApi("idle.setDetectionInterval");
    }
}
class EdgeNotificationBridge {
    get onButtonClicked() { return bridgeLog.DoActionAndLog(() => { return myBrowser.notifications.onButtonClicked; }, "notifications.onButtonClicked"); }
    get onClicked() { return bridgeLog.DoActionAndLog(() => { return myBrowser.notifications.onClicked; }, "notifications.onClicked"); }
    get onClosed() { return bridgeLog.DoActionAndLog(() => { return myBrowser.notifications.onClosed; }, "notifications.onClosed"); }
    get onPermissionLevelChanged() { return bridgeLog.DoActionAndLog(() => { return myBrowser.notifications.onPermissionLevelChanged; }, "notifications.onPermissionLevelChanged"); }
    get onShowSettings() { bridgeLog.LogUnavailbleApi("notifications.onShowSettings"); return bridgeHelper.fakeEvent; }
    clear(notificationId, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.notifications.clear.apply(null, arguments);
        }, "notifications.clear");
    }
    create(notificationId, options, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.notifications.create.apply(null, arguments);
        }, "notifications.create");
    }
    getAll(callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.notifications.getAll.apply(null, arguments);
        }, "notifications.getAll");
    }
    getPermissionLevel(callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.notifications.getPermissionLevel.apply(null, arguments);
        }, "notifications.getPermissionLevel");
    }
    update(notificationId, options, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.notifications.update.apply(null, arguments);
        }, "notifications.update");
    }
}
class EdgePageActionBridge {
    get onClicked() { return bridgeLog.DoActionAndLog(() => { return myBrowser.pageAction.onClicked; }, "pageAction.onClicked"); }
    getPopup(details, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.pageAction.getPopup.apply(null, arguments);
        }, "pageAction.getPopup");
    }
    getTitle(details, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.pageAction.getTitle.apply(null, arguments);
        }, "pageAction.getTitle");
    }
    hide(tabId) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.pageAction.hide.apply(null, arguments);
        }, "pageAction.hide");
    }
    setTitle(details) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.pageAction.setTitle.apply(null, arguments);
        }, "pageAction.setTitle");
    }
    setIcon(details, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.pageAction.setIcon.apply(null, arguments);
        }, "pageAction.setIcon");
    }
    setPopup(details) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.pageAction.setPopup.apply(null, arguments);
        }, "pageAction.setPopup");
    }
    show(tabId) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.pageAction.show.apply(null, arguments);
        }, "pageAction.show");
    }
}
class EdgePermissionsBridge {
    get onAdded() { bridgeLog.LogUnavailbleApi("permissions.onAdded"); return bridgeHelper.fakeEvent; }
    get onRemoved() { bridgeLog.LogUnavailbleApi("permissions.onRemoved"); return bridgeHelper.fakeEvent; }
    contains(permissions, callback) {
        bridgeLog.LogUnavailbleApi("permissions.contains");
    }
    getAll(callback) {
        bridgeLog.LogUnavailbleApi("permissions.getAll");
    }
    remove(permissions, callback) {
        bridgeLog.LogUnavailbleApi("permissions.remove");
    }
    request(permissions, callback) {
        bridgeLog.LogUnavailbleApi("permissions.request");
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
class EdgeTabsBridge {
    get onActivated() { return bridgeLog.DoActionAndLog(() => { return myBrowser.tabs.onActivated; }, "tabs.onActivated"); }
    get onAttached() { return bridgeLog.DoActionAndLog(() => { return myBrowser.tabs.onAttached; }, "tabs.onAttached"); }
    get onCreated() { return bridgeLog.DoActionAndLog(() => { return myBrowser.tabs.onCreated; }, "tabs.onCreated"); }
    get onDetached() { return bridgeLog.DoActionAndLog(() => { return myBrowser.tabs.onDetached; }, "tabs.onDetached"); }
    get onRemoved() { return bridgeLog.DoActionAndLog(() => { return myBrowser.tabs.onRemoved; }, "tabs.onRemoved"); }
    get onReplaced() { return bridgeLog.DoActionAndLog(() => { return myBrowser.tabs.onReplaced; }, "tabs.onReplaced"); }
    get onUpdated() { return bridgeLog.DoActionAndLog(() => { return myBrowser.tabs.onUpdated; }, "tabs.onUpdated"); }
    captureVisibleTab(windowId, options, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.tabs.captureVisibleTab.apply(null, arguments);
        }, "tabs.captureVisibleTab");
    }
    create(createProperties, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.tabs.create.apply(null, arguments);
        }, "tabs.create");
    }
    detectLanguage(tabId, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.tabs.detectLanguage.apply(null, arguments);
        }, "tabs.detectLanguage");
    }
    executeScript(tabId, details, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.tabs.executeScript.apply(null, arguments);
        }, "tabs.executeScript");
    }
    get(tabId, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.tabs.get.apply(null, arguments);
        }, "tabs.get");
    }
    getCurrent(callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.tabs.getCurrent.apply(null, arguments);
        }, "tabs.getCurrent");
    }
    insertCSS(tabId, details, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.tabs.insertCSS.apply(null, arguments);
        }, "tabs.insertCSS");
    }
    query(queryInfo, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.tabs.query.apply(null, arguments);
        }, "tabs.query");
    }
    reload(tabId, reloadProperties, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.tabs.reload.apply(null, arguments);
        }, "tabs.reload");
    }
    remove(tabId, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.tabs.remove.apply(null, arguments);
        }, "tabs.remove");
    }
    sendMessage(tabId, message, responseCallback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.tabs.sendMessage.apply(null, arguments);
        }, "tabs.sendMessage");
    }
    update(tabId, updateProperties, callback) {
        var updatePropertiesBridged = false;
        for (var index = 0; index < arguments.length; index++) {
            var argument = arguments[index];
            if (typeof argument === "object") {
                if (!argument.active && (argument.highlighted || argument.selected)) {
                    argument.active = argument.highlighted || argument.selected;
                    updatePropertiesBridged = true;
                }
            }
        }
        bridgeLog.DoActionAndLog(() => {
            myBrowser.tabs.update.apply(null, arguments);
        }, "tabs.update", undefined, updatePropertiesBridged ? "tabs.update with UpdateProperties modified" : undefined);
    }
}
class EdgeChromeTabsBridge extends EdgeTabsBridge {
    get onHighlighted() { bridgeLog.LogUnavailbleApi("tabs.onHighlighted"); return bridgeHelper.fakeEvent; }
    get onMoved() { bridgeLog.LogUnavailbleApi("tabs.onMoved"); return bridgeHelper.fakeEvent; }
    get onSelectionChanged() {
        return bridgeLog.DoActionAndLog(() => {
            var fakeEvent = bridgeHelper.fakeEvent;
            fakeEvent.addListener = (callback) => {
                myBrowser.tabs.onActivated.addListener((activeInfo) => {
                    callback(activeInfo.tabId, { windowId: activeInfo.windowId });
                });
            };
            return fakeEvent;
        }, "tabs.onSelectionChanged", "tabs.onActivated", "tabs.onActivated");
    }
    duplicate(tabId, callback) {
        bridgeLog.DoActionAndLog(() => {
            var tabGetCallback = function (tab) {
                if (typeof callback !== "undefined") {
                    myBrowser.tabs.create({ url: tab.url }, callback);
                }
                else {
                    myBrowser.tabs.create({ url: tab.url });
                }
            };
            EdgeTabsBridge.prototype.get(tabId, tabGetCallback);
        }, "tabs.duplicate", undefined, "tabs.create");
    }
    getAllInWindow(windowId, callback) {
        bridgeLog.DoActionAndLog(() => {
            EdgeTabsBridge.prototype.query({ windowId: windowId }, callback);
        }, "tabs.getAllInWindow", "tabs.query", "tabs.query");
    }
    getSelected(windowId, callback) {
        bridgeLog.DoActionAndLog(() => {
            EdgeTabsBridge.prototype.query({ active: true }, (tabs) => callback(tabs[0]));
        }, "tabs.getSelected", "tabs.query", "tabs.query");
    }
    sendRequest(tabId, request, responseCallback) {
        bridgeLog.DoActionAndLog(() => {
            EdgeTabsBridge.prototype.sendMessage.apply(null, arguments);
        }, "tabs.sendRequest", "tabs.sendMessage", "tabs.sendMessage");
    }
    connect(tabId, connectInfo) {
        bridgeLog.LogUnavailbleApi("tabs.connect");
        return null;
    }
    highlight(highlightInfo, callback) {
        bridgeLog.LogUnavailbleApi("tabs.highlight");
    }
    move(tabId, moveProperties, callback) {
        bridgeLog.LogUnavailbleApi("tabs.move");
    }
}
class EdgeWebNavigationBridge {
    get onBeforeNavigate() { return bridgeLog.DoActionAndLog(() => { return myBrowser.webNavigation.onBeforeNavigate; }, "webNavigation.onBeforeNavigate"); }
    get onCommitted() { return bridgeLog.DoActionAndLog(() => { return myBrowser.webNavigation.onCommitted; }, "webNavigation.onCommitted"); }
    get onCompleted() { return bridgeLog.DoActionAndLog(() => { return myBrowser.webNavigation.onCompleted; }, "webNavigation.onCompleted"); }
    get onCreatedNavigationTarget() { return bridgeLog.DoActionAndLog(() => { return myBrowser.webNavigation.onCreatedNavigationTarget; }, "webNavigation.onCreatedNavigationTarget"); }
    get onDOMContentLoaded() { return bridgeLog.DoActionAndLog(() => { return myBrowser.webNavigation.onDOMContentLoaded; }, "webNavigation.onDOMContentLoaded"); }
    get onErrorOccurred() { return bridgeLog.DoActionAndLog(() => { return myBrowser.webNavigation.onErrorOccurred; }, "webNavigation.onErrorOccurred"); }
    get onHistoryStateUpdated() { return bridgeLog.DoActionAndLog(() => { return myBrowser.webNavigation.onHistoryStateUpdated; }, "webNavigation.onHistoryStateUpdated"); }
    get onReferenceFragmentUpdated() { return bridgeLog.DoActionAndLog(() => { return myBrowser.webNavigation.onReferenceFragmentUpdated; }, "webNavigation.onReferenceFragmentUpdated"); }
    get onTabReplaced() { return bridgeLog.DoActionAndLog(() => { return myBrowser.webNavigation.onTabReplaced; }, "webNavigation.onTabReplaced"); }
    getAllFrames(details, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.webNavigation.getAllFrames.apply(null, arguments);
        }, "webNavigation.getAllFrames");
    }
    getFrame(details, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.webNavigation.getFrame.apply(null, arguments);
        }, "webNavigation.getFrame");
    }
}
class EdgeWebRequestBridge {
    get MAX_HANDLER_BEHAVIOR_CHANGED_CALLS_PER_10_MINUTES() { return bridgeLog.DoActionAndLog(() => { return myBrowser.webRequest.MAX_HANDLER_BEHAVIOR_CHANGED_CALLS_PER_10_MINUTES; }, "webNavigation.MAX_HANDLER_BEHAVIOR_CHANGED_CALLS_PER_10_MINUTES"); }
    get onAuthRequired() { return bridgeLog.DoActionAndLog(() => { return myBrowser.webRequest.onAuthRequired; }, "webRequest.onAuthRequired"); }
    get onBeforeRedirect() { return bridgeLog.DoActionAndLog(() => { return myBrowser.webRequest.onBeforeRedirect; }, "webRequest.onBeforeRedirect"); }
    get onBeforeRequest() { return bridgeLog.DoActionAndLog(() => { return myBrowser.webRequest.onBeforeRequest; }, "webRequest.onBeforeRequest"); }
    get onBeforeSendHeaders() { return bridgeLog.DoActionAndLog(() => { return myBrowser.webRequest.onBeforeSendHeaders; }, "webRequest.onBeforeSendHeaders"); }
    get onCompleted() { return bridgeLog.DoActionAndLog(() => { return myBrowser.webRequest.onCompleted; }, "webRequest.onCompleted"); }
    get onErrorOccurred() { return bridgeLog.DoActionAndLog(() => { return myBrowser.webRequest.onErrorOccurred; }, "webRequest.onErrorOccurred"); }
    get onHeadersReceived() { return bridgeLog.DoActionAndLog(() => { return myBrowser.webRequest.onHeadersReceived; }, "webRequest.onHeadersReceived"); }
    get onResponseStarted() { return bridgeLog.DoActionAndLog(() => { return myBrowser.webRequest.onResponseStarted; }, "webRequest.onResponseStarted"); }
    get onSendHeaders() { return bridgeLog.DoActionAndLog(() => { return myBrowser.webRequest.onSendHeaders; }, "webRequest.onSendHeaders"); }
    handlerBehaviorChanged(callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.webRequest.handlerBehaviorChanged.apply(null, arguments);
        }, "webRequest.handlerBehaviorChanged");
    }
}
class EdgeWindowsBridge {
    get WINDOW_ID_CURRENT() { return bridgeLog.DoActionAndLog(() => { return myBrowser.windows.WINDOW_ID_CURRENT; }, "windows.WINDOW_ID_CURRENT"); }
    get WINDOW_ID_NONE() { return bridgeLog.DoActionAndLog(() => { return myBrowser.windows.WINDOW_ID_NONE; }, "windows.WINDOW_ID_NONE"); }
    get onCreated() { return bridgeLog.DoActionAndLog(() => { return myBrowser.windows.onCreated; }, "windows.onCreated"); }
    get onFocusChanged() { return bridgeLog.DoActionAndLog(() => { return myBrowser.windows.onFocusChanged; }, "windows.onFocusChanged"); }
    get onRemoved() { return bridgeLog.DoActionAndLog(() => { return myBrowser.windows.onRemoved; }, "windows.onRemoved"); }
    create(createData, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.windows.create.apply(null, arguments);
        }, "windows.create");
    }
    get(windowId, getInfo, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.windows.get.apply(null, arguments);
        }, "windows.get");
    }
    getAll(getInfo, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.windows.getAll.apply(null, arguments);
        }, "windows.getAll");
    }
    getCurrent(getInfo, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.windows.getCurrent.apply(null, arguments);
        }, "windows.getCurrent");
    }
    getLastFocused(getInfo, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.windows.getLastFocused.apply(null, arguments);
        }, "windows.getLastFocused");
    }
    update(windowId, updateInfo, callback) {
        bridgeLog.DoActionAndLog(() => {
            myBrowser.windows.update.apply(null, arguments);
        }, "windows.update");
    }
}
class EdgeChromeWindowsBridge extends EdgeWindowsBridge {
    remove(windowId, callback) {
        bridgeLog.LogUnavailbleApi("windows.remove");
    }
}
class EdgeBackgroundBridge {
    constructor() {
        this.alarms = new EdgeChromeAlarmBridge();
        this.app = new EdgeChromeAppBridge();
        this.commands = new EdgeChromeCommandsBridge();
        this.idle = new EdgeChromeIdleBridge();
        this.notifications = new EdgeNotificationBridge();
        this.bookmarks = typeof browser["bookmarks"] !== "undefined" ? new EdgeChromeBookmarksBridge() : undefined;
        this.browserAction = typeof browser.browserAction !== "undefined" ? new EdgeChromeBrowserActionBridge() : undefined;
        this.contextMenus = typeof browser.contextMenus !== "undefined" ? new EdgeContextMenusBridge() : undefined;
        this.cookies = typeof browser.cookies !== "undefined" ? new EdgeChromeCookiesBridge() : undefined;
        this.extension = typeof browser.extension !== "undefined" ? new EdgeChromeExtensionBridge() : undefined;
        this.history = typeof browser.history !== "undefined" ? new EdgeHistoryBridge() : undefined;
        this.i18n = typeof browser.i18n !== "undefined" ? new EdgeI18nBridge() : undefined;
        this.pageAction = typeof browser.pageAction !== "undefined" ? new EdgePageActionBridge() : undefined;
        this.permissions = typeof browser.permissions !== "undefined" ? new EdgePermissionsBridge() : undefined;
        this.runtime = typeof browser.runtime !== "undefined" ? new EdgeChromeRuntimeBridge() : undefined;
        this.storage = typeof browser.storage !== "undefined" ? new EdgeChromeStorageBridge() : undefined;
        this.tabs = typeof browser.tabs !== "undefined" ? new EdgeChromeTabsBridge() : undefined;
        this.webNavigation = typeof browser.webNavigation !== "undefined" ? new EdgeWebNavigationBridge() : undefined;
        this.webRequest = typeof browser.webRequest !== "undefined" ? new EdgeWebRequestBridge() : undefined;
        this.windows = typeof browser.windows !== "undefined" ? new EdgeChromeWindowsBridge() : undefined;
    }
}
var myBrowser = browser;
var chrome = new EdgeBackgroundBridge();
