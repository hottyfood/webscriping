(() => {
  "use strict";

  const overrideGetter = (proto, prop, value) => {
    try {
      Object.defineProperty(proto, prop, {
        get() {
          return value;
        },
        configurable: true
      });
    } catch (e) {
      console.log(`Could not override ${prop}`, e);
    }
  };

  // Override on prototype level when possible
  overrideGetter(Document.prototype, "hidden", false);
  overrideGetter(Document.prototype, "visibilityState", "visible");
  overrideGetter(Document.prototype, "webkitHidden", false);
  overrideGetter(Document.prototype, "webkitVisibilityState", "visible");

  // Intercept event listeners for visibilitychange / blur
  const originalAddEventListener = EventTarget.prototype.addEventListener;

  EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (type === "visibilitychange" || type === "blur") {
      console.log(`Blocked listener for: ${type}`);
      return;
    }
    return originalAddEventListener.call(this, type, listener, options);
  };

  // Neutralize direct handlers
  try {
    Object.defineProperty(document, "onvisibilitychange", {
      set() {
        console.log("Blocked document.onvisibilitychange");
      },
      get() {
        return null;
      },
      configurable: true
    });
  } catch (e) {}

  try {
    Object.defineProperty(window, "onblur", {
      set() {
        console.log("Blocked window.onblur");
      },
      get() {
        return null;
      },
      configurable: true
    });
  } catch (e) {}

  // Capture and kill events if they still happen
  const kill = (e) => e.stopImmediatePropagation();
  document.addEventListener("visibilitychange", kill, true);
  window.addEventListener("blur", kill, true);

  console.log("Always Active Tab aggressive mode injected");
})();