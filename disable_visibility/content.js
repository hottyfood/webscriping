const script = document.createElement("script");
script.src = chrome.runtime.getURL("inject.js");
script.onload = () => script.remove();
(document.documentElement || document.head).appendChild(script);