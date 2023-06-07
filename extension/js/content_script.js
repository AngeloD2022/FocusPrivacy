(function () {
    console.log("FocusPrivacy: payload injected.");

    // TODO: implement some way to interact with these functions from the popup UI.

    let removedCallbacks = {
        "blur": [],
        "focus": []
    }

    function removeWindowListeners() {
        // Remove all the blacklisted event listeners from the window.
        for (let key in removedCallbacks) {
            if (removedCallbacks[key].length === 0)
                continue;

            for (let callback of removedCallbacks[key]) {
                window.removeEventListener(key, callback);
            }
        }
    }

    function monkeypatchWindow() {
        // if the site uses window.onfocus or window.onblur, we need to overwrite the callbacks.
        // TODO: store these callbacks somewhere so we can reapply them later if the user wants to disable protection.
        window.onfocus = function () {};
        window.onblur = function () {};
    }

    function monkeypatchDocument(focused) {
        document.isFocused = function () {
            return focused;
        };
    }

    // We need to first monkeypatch addEventListener to record any pertinent callback functions.
    // This is necessary because getEventListeners() is only exposed to the devtools console.
    Window.prototype._addEventListener = Window.prototype.addEventListener;
    Window.prototype.addEventListener = function (type, listener, options) {
        if (type in removedCallbacks) {
            // the reason we're removing them later as opposed to simply not adding them is because we want to
            // give the option to reapply them/disable protection later in the UI.
            removedCallbacks[type].push(listener);
        }

        this._addEventListener(type, listener, options);
    }

    monkeypatchDocument(true);

    document.addEventListener("DOMContentLoaded",function (e) {
        monkeypatchWindow();
        removeWindowListeners();
        console.log("FocusPrivacy: runtime patch complete.");
    });

})();
