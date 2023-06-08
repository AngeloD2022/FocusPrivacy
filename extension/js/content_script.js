(function () {
    console.log("FocusPrivacy: payload injected.");
    // TODO: implement some way to interact with these functions from the popup UI.

    let removedCallbacks = {
        "blur": [],
        "focus": []
    }

    function antiToStringDetection(func){
        // this needs serious work, but it's good enough for now.

        let next = func;

        for (let i = 0; i < 50; i++) {
            next.toString = function () {
                return "function toString() { [native code] }";
            }
            let localeNext = next;
            for (let j = 0; j < 50; j++) {
                localeNext.toLocaleString = function () {
                    return "function toLocaleString() { [native code] }";
                }
                localeNext = localeNext.toLocaleString;
            }
            next = next.toString;
        }
    }

    let onblurImpostor = function () {};
    let onfocusImpostor = function () {};

    function updateImpostorFunctions() {
        // this is crazy enough that it just might work.
        if (window.onfocus != null && window.onfocus !== onfocusImpostor){
            let focusString = window.onfocus.toString();
            onfocusImpostor.toString = function () {
                return focusString;
            }
            antiToStringDetection(onfocusImpostor.toString);
            antiToStringDetection(onfocusImpostor.toLocaleString);
        }
        if (window.onblur != null && window.onblur !== onblurImpostor){
            let blurString = window.onblur.toString();
            onblurImpostor.toString = function () {
                return blurString;
            }
            antiToStringDetection(onblurImpostor.toString);
            antiToStringDetection(onblurImpostor.toLocaleString);
        }
    }

    function monkeypatchWindow() {
        // if the site uses window.onfocus or window.onblur, we need to overwrite the callbacks.
        // TODO: store these callbacks somewhere so we can reapply them later if the user wants to disable protection.
        // precondition: window.onfocus and window.onblur are not equal to the impostor functions.
        updateImpostorFunctions();

        if (window.onfocus != null) {
            window.onfocus = onfocusImpostor;
        }
        if (window.onblur != null){
            window.onblur = onblurImpostor;
        }
    }

    function monkeypatchDocument() {
        document.hasFocus = function () {
            return true;
        };
        document.hasFocus.toString = function () {
            return "function hasFocus() { [native code] }";
        }
        antiToStringDetection(document.hasFocus.toString);
        antiToStringDetection(document.hasFocus.toLocaleString);
    }

    // prevent "focus" and "blur" events from ever being subscribed.
    Window.prototype._addEventListener = Window.prototype.addEventListener;
    Window.prototype.addEventListener = function (type, listener, options) {
        if (type in removedCallbacks) {
            console.log("FocusPrivacy: prevented " + type + " event subscription.")
            removedCallbacks[type].push(listener);
            return;
        }

        this._addEventListener(type, listener, options);
    }

    monkeypatchDocument();

    document.addEventListener("DOMContentLoaded",function (e) {
        monkeypatchWindow();
        console.log("FocusPrivacy: runtime patch complete.");

        setInterval(function(){
            if ((window.onblur && window.onblur !== onblurImpostor) || (window.onfocus && window.onfocus !== onfocusImpostor)) {
                monkeypatchWindow();
                console.log("FocusPrivacy: window patch re-applied.");
            }
            if (!document.hasFocus()) {
                monkeypatchDocument()
                console.log("FocusPrivacy: document focus patch re-applied.");
            }
        }, 1000)
    });

})();
