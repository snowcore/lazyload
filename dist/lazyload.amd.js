var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

define(function () {
	'use strict';

	var getInstanceSettings = function getInstanceSettings(customSettings) {
		var defaultSettings = {
			elements_selector: "img",
			container: document,
			threshold: 300,
			data_src: "src",
			data_srcset: "srcset",
			data_sizes: "sizes",
			class_loading: "loading",
			class_loaded: "loaded",
			class_error: "error",
			load_delay: 0,
			callback_load: null,
			callback_error: null,
			callback_set: null,
			callback_enter: null,
			to_webp: false
		};

		return _extends({}, defaultSettings, customSettings);
	};

	var dataPrefix = "data-";
	var processedDataName = "was-processed";
	var inViewportDataName = "in-viewport";
	var trueString = "true";

	var getData = function getData(element, attribute) {
		return element.getAttribute(dataPrefix + attribute);
	};

	var setData = function setData(element, attribute, value) {
		return element.setAttribute(dataPrefix + attribute, value);
	};

	var setWasProcessed = function setWasProcessed(element) {
		return setData(element, processedDataName, trueString);
	};

	var getWasProcessed = function getWasProcessed(element) {
		return getData(element, processedDataName) === trueString;
	};

	var setInViewport = function setInViewport(element) {
		var value = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : trueString;
		return setData(element, inViewportDataName, value);
	};

	var getInViewport = function getInViewport(element) {
		return getData(element, inViewportDataName) === trueString;
	};

	function purgeElements(elements) {
		return elements.filter(function (element) {
			return !getWasProcessed(element);
		});
	}

	/* Creates instance and notifies it through the window element */
	var createInstance = function createInstance(classObj, options) {
		var event;
		var eventString = "LazyLoad::Initialized";
		var instance = new classObj(options);
		try {
			// Works in modern browsers
			event = new CustomEvent(eventString, { detail: { instance: instance } });
		} catch (err) {
			// Works in Internet Explorer (all versions)
			event = document.createEvent("CustomEvent");
			event.initCustomEvent(eventString, false, false, { instance: instance });
		}
		window.dispatchEvent(event);
	};

	/* Auto initialization of one or more instances of lazyload, depending on the 
     options passed in (plain object or an array) */
	function autoInitialize(classObj, options) {
		if (!options) {
			return;
		}
		if (!options.length) {
			// Plain object
			createInstance(classObj, options);
		} else {
			// Array of objects
			for (var i = 0, optionsItem; optionsItem = options[i]; i += 1) {
				createInstance(classObj, optionsItem);
			}
		}
	}

	var replaceExtToWebp = function replaceExtToWebp(value, condition) {
		return condition ? value.replace(/\.(jpe?g|png)/gi, ".webp") : value;
	};

	var detectWebp = function detectWebp() {
		var webpString = "image/webp";
		var canvas = document.createElement("canvas");

		if (canvas.getContext && canvas.getContext("2d")) {
			return canvas.toDataURL(webpString).indexOf("data:" + webpString) === 0;
		}

		return false;
	};

	var runningOnBrowser = typeof window !== "undefined";

	var isBot = runningOnBrowser && !("onscroll" in window) || /(gle|ing|ro)bot|crawl|spider/i.test(navigator.userAgent);

	var supportsIntersectionObserver = runningOnBrowser && "IntersectionObserver" in window;

	var supportsClassList = runningOnBrowser && "classList" in document.createElement("p");

	var supportsWebp = runningOnBrowser && detectWebp();

	var setSourcesInChildren = function setSourcesInChildren(parentTag, attrName, dataAttrName, toWebpFlag) {
		for (var i = 0, childTag; childTag = parentTag.children[i]; i += 1) {
			if (childTag.tagName === "SOURCE") {
				var attrValue = getData(childTag, dataAttrName);
				setAttributeIfValue(childTag, attrName, attrValue, toWebpFlag);
			}
		}
	};

	var setAttributeIfValue = function setAttributeIfValue(element, attrName, value, toWebpFlag) {
		if (!value) {
			return;
		}
		element.setAttribute(attrName, replaceExtToWebp(value, toWebpFlag));
	};

	var setSourcesImg = function setSourcesImg(element, settings) {
		var toWebpFlag = supportsWebp && settings.to_webp;
		var srcsetDataName = settings.data_srcset;
		var parent = element.parentNode;

		if (parent && parent.tagName === "PICTURE") {
			setSourcesInChildren(parent, "srcset", srcsetDataName, toWebpFlag);
		}
		var sizesDataValue = getData(element, settings.data_sizes);
		setAttributeIfValue(element, "sizes", sizesDataValue);
		var srcsetDataValue = getData(element, srcsetDataName);
		setAttributeIfValue(element, "srcset", srcsetDataValue, toWebpFlag);
		var srcDataValue = getData(element, settings.data_src);
		setAttributeIfValue(element, "src", srcDataValue, toWebpFlag);
	};

	var setSourcesIframe = function setSourcesIframe(element, settings) {
		var srcDataValue = getData(element, settings.data_src);

		setAttributeIfValue(element, "src", srcDataValue);
	};

	var setSourcesVideo = function setSourcesVideo(element, settings) {
		var srcDataName = settings.data_src;
		var srcDataValue = getData(element, srcDataName);

		setSourcesInChildren(element, "src", srcDataName);
		setAttributeIfValue(element, "src", srcDataValue);
	};

	var setSourcesBgImage = function setSourcesBgImage(element, settings) {
		var toWebpFlag = supportsWebp && settings.to_webp;
		var srcDataValue = getData(element, settings.data_src);

		if (srcDataValue) {
			var setValue = replaceExtToWebp(srcDataValue, toWebpFlag);
			element.style.backgroundImage = "url(\"" + setValue + "\")";
		}
	};

	var setSourcesFunctions = {
		IMG: setSourcesImg,
		IFRAME: setSourcesIframe,
		VIDEO: setSourcesVideo
	};

	var setSources = function setSources(element, settings) {
		var tagName = element.tagName;
		var setSourcesFunction = setSourcesFunctions[tagName];
		if (setSourcesFunction) {
			setSourcesFunction(element, settings);
			return;
		}
		setSourcesBgImage(element, settings);
	};

	var addClass = function addClass(element, className) {
		if (supportsClassList) {
			element.classList.add(className);
			return;
		}
		element.className += (element.className ? " " : "") + className;
	};

	var removeClass = function removeClass(element, className) {
		if (supportsClassList) {
			element.classList.remove(className);
			return;
		}
		element.className = element.className.replace(new RegExp("(^|\\s+)" + className + "(\\s+|$)"), " ").replace(/^\s+/, "").replace(/\s+$/, "");
	};

	var managedTags = ["IMG", "IFRAME", "VIDEO"];

	var callCallback = function callCallback(callback, argument) {
		if (callback) {
			callback(argument);
		}
	};

	var loadString = "load";
	var errorString = "error";

	var removeListeners = function removeListeners(element, loadHandler, errorHandler) {
		element.removeEventListener(loadString, loadHandler);
		element.removeEventListener(errorString, errorHandler);
	};

	var addOneShotListeners = function addOneShotListeners(element, settings) {
		var onLoad = function onLoad(event) {
			onEvent(event, true, settings);
			removeListeners(element, onLoad, onError);
		};
		var onError = function onError(event) {
			onEvent(event, false, settings);
			removeListeners(element, onLoad, onError);
		};
		element.addEventListener(loadString, onLoad);
		element.addEventListener(errorString, onError);
	};

	var onEvent = function onEvent(event, success, settings) {
		var element = event.target;
		removeClass(element, settings.class_loading);
		addClass(element, success ? settings.class_loaded : settings.class_error); // Setting loaded or error class
		callCallback(success ? settings.callback_load : settings.callback_error, element);
	};

	var loadObserved = function loadObserved(element, observer, settings) {
		revealElement(element, settings);
		observer.unobserve(element);
	};

	var delayLoad = function delayLoad(element, observer, settings) {
		var loadDelay = settings.load_delay;
		setTimeout(function () {
			if (getInViewport(element)) {
				loadObserved(element, observer, settings);
			}
		}, loadDelay);
	};

	function revealElement(element, settings, force) {
		if (!force && getWasProcessed(element)) {
			return; // element has already been processed and force wasn't true
		}
		callCallback(settings.callback_enter, element);
		if (managedTags.indexOf(element.tagName) > -1) {
			addOneShotListeners(element, settings);
			addClass(element, settings.class_loading);
		}
		setSources(element, settings);
		setWasProcessed(element);
		callCallback(settings.callback_set, element);
	}

	/* entry.isIntersecting needs fallback because is null on some versions of MS Edge, and
    entry.intersectionRatio is not enough alone because it could be 0 on some intersecting elements */
	var isIntersecting = function isIntersecting(entry) {
		return entry.isIntersecting || entry.intersectionRatio > 0;
	};

	var getObserverSettings = function getObserverSettings(settings) {
		return {
			root: settings.container === document ? null : settings.container,
			rootMargin: settings.threshold + "px",
			threshold: 0
		};
	};

	var LazyLoad = function LazyLoad(customSettings, elements) {
		this._settings = getInstanceSettings(customSettings);
		this._setObserver();
		this.update(elements);
	};

	LazyLoad.prototype = {
		_manageIntersection: function _manageIntersection(entry) {
			var observer = this._observer;
			var settings = this._settings;
			var loadDelay = this._settings.load_delay;
			var element = entry.target;
			if (isIntersecting(entry)) {
				if (loadDelay === 0) {
					loadObserved(element, observer, settings);
				} else {
					delayLoad(element, observer, settings);
				}
			}

			// Writes in and outs in a data-attribute
			if (isIntersecting(entry)) {
				setInViewport(element);
			} else {
				setInViewport(element, false);
			}
		},
		_onIntersection: function _onIntersection(entries) {
			entries.forEach(this._manageIntersection.bind(this));
			this._elements = purgeElements(this._elements);
		},
		_setObserver: function _setObserver() {
			if (!supportsIntersectionObserver) {
				return;
			}
			this._observer = new IntersectionObserver(this._onIntersection.bind(this), getObserverSettings(this._settings));
		},

		loadAll: function loadAll() {
			var _this = this;

			this._elements.forEach(function (element) {
				_this.load(element);
			});
			this._elements = purgeElements(this._elements);
		},

		update: function update(elements) {
			var _this2 = this;

			var settings = this._settings;
			var nodeSet = elements || settings.container.querySelectorAll(settings.elements_selector);

			this._elements = purgeElements(Array.prototype.slice.call(nodeSet)); // nodeset to array for IE compatibility

			if (isBot || !this._observer) {
				this.loadAll();
				return;
			}

			this._elements.forEach(function (element) {
				_this2._observer.observe(element);
			});
		},

		destroy: function destroy() {
			var _this3 = this;

			if (this._observer) {
				purgeElements(this._elements).forEach(function (element) {
					_this3._observer.unobserve(element);
				});
				this._observer = null;
			}
			this._elements = null;
			this._settings = null;
		},

		load: function load(element, force) {
			revealElement(element, this._settings, force);
		}
	};

	/* Automatic instances creation if required (useful for async script loading) */
	if (runningOnBrowser) {
		autoInitialize(LazyLoad, window.lazyLoadOptions);
	}

	return LazyLoad;
});