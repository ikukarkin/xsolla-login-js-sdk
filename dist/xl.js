(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.XL = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

/**
 * Created by a.korotaev on 07.11.16.
 */
if (!String.prototype.startsWith) {
    String.prototype.startsWith = function (searchString, position) {
        position = position || 0;
        return this.indexOf(searchString, position) === position;
    };
}

if (typeof window.CustomEvent !== "function") {
    var CustomEvent = function CustomEvent(event, params) {
        params = params || { bubbles: false, cancelable: false, detail: undefined };
        var evt = document.createEvent('CustomEvent');
        evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
        return evt;
    };

    CustomEvent.prototype = window.Event.prototype;

    window.CustomEvent = CustomEvent;
}

},{}],2:[function(require,module,exports){
'use strict';

/**
 * Created by a.korotaev on 24.06.16.
 */
/**
 * Impelements Xsolla Login Api
 * @param projectId - project's unique identifier
 * @param baseUrl - api endpoint
 * @constructor
 */

var XLApi = function XLApi(projectId, baseUrl) {
    var self = this;
    this.baseUrl = baseUrl || '//login.xsolla.com/api/';

    this.projectId = projectId;

    this.makeApiCall = function (params, success, error) {
        var r = new XMLHttpRequest();
        r.withCredentials = true;
        r.open(params.method, self.baseUrl + params.endpoint, true);
        r.onreadystatechange = function () {
            if (r.readyState == 4) {
                if (r.status == 200) {
                    success(JSON.parse(r.responseText));
                } else {
                    if (r.responseText) {
                        error(JSON.parse(r.responseText));
                    } else {
                        error({ error: { message: 'Networking error', code: r.status } });
                    }
                }
            }
        };
        if (params.method == 'POST') {
            r.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
            r.send(params.postBody);
        } else if (params.method == 'GET') {
            r.send(params.getArguments);
        }
    };
};
/**
 * Get all avialable social methods auth url
 * @param success - success callback
 * @param error - error callback
 * @param getArguments - additional params to send with request
 */
XLApi.prototype.getSocialsURLs = function (success, error, getArguments) {
    var str = "";
    for (var key in getArguments) {
        if (str != "") {
            str += "&";
        }
        str += key + "=" + encodeURIComponent(getArguments[key]);
    }

    return this.makeApiCall({ method: 'GET', endpoint: 'social/login_urls?' + str, getArguments: null }, success, error);
};

XLApi.prototype.loginPassAuth = function (login, pass, rememberMe, redirectUrl, success, error) {
    var body = {
        username: login,
        password: pass,
        remember_me: rememberMe
    };
    return this.makeApiCall({ method: 'POST', endpoint: 'proxy/login?projectId=' + this.projectId + '&redirect_url=' + encodeURIComponent(redirectUrl), postBody: JSON.stringify(body) }, success, error);
};

XLApi.prototype.smsAuth = function (phoneNumber, success, error) {
    return this.makeApiCall({ method: 'GET', endpoint: 'sms', getArguments: 'phoneNumber=' + phoneNumber }, success, error);
};

module.exports = XLApi;

},{}],"main":[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _xlapi = require('./xlapi');

var _xlapi2 = _interopRequireDefault(_xlapi);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Created by a.korotaev on 24.06.16.
 */
require('./supports');

/**
 * Create an `Auth0` instance with `options`
 *
 * @class XL
 * @constructor
 */

var DEFAULT_CONFIG = {
    errorHandler: function errorHandler(a) {},
    loginPassValidator: function loginPassValidator(a, b) {
        return true;
    },
    isMarkupSocialsHandlersEnabled: false,
    apiUrl: '//login.xsolla.com/api/',
    maxXLClickDepth: 20,
    onlyWidgets: false,
    theme: 'app.default.css',
    preloader: '<div></div>'
};

var INVALID_LOGIN_ERROR_CODE = 1;
var INCORRECT_LOGIN_OR_PASSWORD_ERROR_CODE = 2;

var XL = function () {
    function XL() {
        _classCallCheck(this, XL);

        this.socialUrls = {};
        this.eventTypes = {
            LOAD: 'load',
            CLOSE: 'close'
        };

        this.ROUTES = {
            LOGIN: '',
            REGISTRATION: 'registration',
            RECOVER_PASSWORD: 'reset-password',
            ALL_SOCIALS: 'others'
        };

        this.dispatcher = document.createElement('div');
    }

    _createClass(XL, [{
        key: 'init',
        value: function init(options) {
            var _this = this;

            this.config = _extends({}, DEFAULT_CONFIG, options);
            this.api = new _xlapi2.default(options.projectId, this.config.apiUrl);

            Object.keys(this.eventTypes).map(function (eventKey) {
                _this.on(_this.eventTypes[eventKey]);
            });

            if (!this.config.onlyWidgets) {
                // Find closest ancestor with data-xl-auth attribute
                var findAncestor = function findAncestor(el) {
                    if (el.attributes['data-xl-auth']) {
                        return el;
                    }
                    var i = 0;
                    while ((el = el.parentElement) && !el.attributes['data-xl-auth'] && ++i < maxClickDepth) {}
                    return el;
                };

                var params = {};
                params.projectId = options.projectId;
                if (this.config.redirectUrl) {
                    params.redirect_url = this.config.redirectUrl;
                }
                if (this.config.loginUrl) {
                    params.login_url = this.config.loginUrl;
                }

                var updateSocialLinks = function updateSocialLinks() {
                    _this.api.getSocialsURLs(function (response) {
                        _this.socialUrls = {};
                        for (var key in response) {
                            if (response.hasOwnProperty(key)) {
                                _this.socialUrls['sn-' + key] = response[key];
                            }
                        }
                    }, function (e) {
                        console.error(e);
                    }, params);
                };

                updateSocialLinks();
                setInterval(updateSocialLinks, 1000 * 60 * 59);

                var maxClickDepth = this.config.maxXLClickDepth;

                if (this.config.isMarkupSocialsHandlersEnabled) {
                    document.addEventListener('click', function (e) {
                        var target = findAncestor(e.target);
                        // Do nothing if click was outside of elements with data-xl-auth
                        if (!target) {
                            return;
                        }
                        var xlData = target.attributes['data-xl-auth'];
                        if (xlData) {
                            var nodeValue = xlData.nodeValue;
                            if (nodeValue) {
                                _this.login({ authType: nodeValue });
                            }
                        }
                    });
                }
            }
        }

        /**
         * Performs login
         * @param prop
         * @param error - call in case error
         * @param success
         */

    }, {
        key: 'login',
        value: function login(prop, error, success) {
            var _this2 = this;

            if (!prop || !this.socialUrls) {
                return;
            }

            /**
             * props
             * authType: sn-<social name>, login-pass, sms
             */
            if (prop.authType) {
                if (prop.authType.startsWith('sn-')) {
                    var socialUrl = this.socialUrls[prop.authType];
                    if (socialUrl != undefined) {
                        window.location.href = this.socialUrls[prop.authType];
                    } else {
                        console.error('Auth type: ' + prop.authType + ' doesn\'t exist');
                    }
                } else if (prop.authType == 'login-pass') {
                    this.api.loginPassAuth(prop.login, prop.pass, prop.rememberMe, this.config.redirectUrl, function (res) {
                        if (res.login_url) {
                            var finishAuth = function finishAuth() {
                                window.location.href = res.login_url;
                            };
                            if (success) {
                                success({ status: 'success', finish: finishAuth, redirectUrl: res.login_url });
                            } else {
                                finishAuth();
                            }
                        } else {
                            error(_this2.createErrorObject('Login or pass not valid', INCORRECT_LOGIN_OR_PASSWORD_ERROR_CODE));
                        }
                    }, function (err) {
                        error(err);
                    });
                } else if (prop.authType == 'sms') {
                    if (smsAuthStep == 'phone') {
                        this.api.smsAuth(prop.phoneNumber, null, null);
                    } else if (smsAuthStep == 'code') {}
                } else {
                    console.error('Unknown auth type');
                }
            }
        }
    }, {
        key: 'createErrorObject',
        value: function createErrorObject(message, code) {
            return {
                error: {
                    message: message,
                    code: code || -1
                }
            };
        }
    }, {
        key: 'getProjectId',
        value: function getProjectId() {
            return this.config.projectId;
        }
    }, {
        key: 'getRedirectURL',
        value: function getRedirectURL() {
            return this.config.redirectUrl;
        }
    }, {
        key: 'getTheme',
        value: function getTheme() {
            return this.config.theme;
        }
    }, {
        key: 'getLoginUrl',
        value: function getLoginUrl() {
            return this.config.loginUrl;
        }
    }, {
        key: 'AuthWidget',
        value: function AuthWidget(elementId, options) {
            var _this3 = this;

            if (this.api) {
                if (!elementId) {
                    console.error('No div name!');
                } else {
                    if (options == undefined) {
                        options = {};
                    }
                    var width = (options.width || 400) + 'px';
                    var height = (options.height || 550) + 'px';

                    var widgetBaseUrl = options.widgetBaseUrl || 'https://xl-widget.xsolla.com/';

                    var route = options.route || this.ROUTES.LOGIN;

                    var src = widgetBaseUrl + route + '?projectId=' + this.getProjectId();

                    if (this.config.locale) {
                        src = src + '&locale=' + this.config.locale;
                    }
                    if (this.config.fields) {
                        src = src + '&fields=' + this.config.fields;
                    }
                    var redirectUrl = this.getRedirectURL();
                    if (redirectUrl) {
                        src = src + '&redirectUrl=' + encodeURIComponent(redirectUrl);
                    }

                    var loginUrl = this.getLoginUrl();
                    if (loginUrl) {
                        src = src + '&login_url=' + encodeURIComponent(loginUrl);
                    }

                    var theme = this.getTheme();
                    if (theme) {
                        src = src + '&theme=' + encodeURIComponent(theme);
                    }

                    var widgetIframe = document.createElement('iframe');
                    widgetIframe.onload = function () {
                        _element.removeChild(_preloader);
                        widgetIframe.style.width = '100%';
                        widgetIframe.style.height = '100%';
                        var event = new CustomEvent('load');
                        _this3.dispatcher.dispatchEvent(event);
                    };
                    widgetIframe.style.width = 0;
                    widgetIframe.style.height = 0;
                    widgetIframe.frameBorder = '0';
                    widgetIframe.src = src;
                    widgetIframe.id = 'XsollaLoginWidgetIframe';

                    var eventMethod = window.addEventListener ? 'addEventListener' : 'attachEvent';
                    var eventer = window[eventMethod];
                    var messageEvent = eventMethod == 'attachEvent' ? 'onmessage' : 'message';

                    // Listen to message from child window
                    eventer(messageEvent, function (e) {
                        var event = new CustomEvent(_this3.eventTypes[e.data]);
                        _this3.dispatcher.dispatchEvent(event);
                    }, false);

                    var _preloader = document.createElement('div');

                    _preloader.innerHTML = this.config.preloader;

                    var _element = document.getElementById(elementId);
                    if (_element) {
                        _element.style.width = width;
                        _element.style.height = height;
                        _element.appendChild(_preloader);
                        _element.appendChild(widgetIframe);
                    } else {
                        console.error('Element \"' + elementId + '\" not found!');
                    }
                }
            } else {
                console.error('Please run XL.init() first');
            }
        }
    }, {
        key: 'onCloseEvent',
        value: function onCloseEvent() {
            var element = document.getElementById('XsollaLoginWidgetIframe');
            element.parentNode.removeChild(element);
        }

        /**
         * link event with handler
         * @param event
         * @param handler
         */

    }, {
        key: 'on',
        value: function on(event, handler) {
            handler = handler || null;

            if (event === this.eventTypes.CLOSE) {
                if (!handler) {
                    handler = this.onCloseEvent;
                } else {
                    this.dispatcher.removeEventListener(event, this.onCloseEvent);
                }
            }

            this.dispatcher.addEventListener(event, handler);
        }
    }]);

    return XL;
}();

var result = new XL();

module.exports = result;

},{"./supports":1,"./xlapi":2}]},{},["main"])("main")
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvc3VwcG9ydHMuanMiLCJzcmMveGxhcGkuanMiLCJzcmMvbWFpbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0FDQUE7OztBQUdBLElBQUksQ0FBQyxPQUFPLFNBQVAsQ0FBaUIsVUFBdEIsRUFBa0M7QUFDOUIsV0FBTyxTQUFQLENBQWlCLFVBQWpCLEdBQThCLFVBQVMsWUFBVCxFQUF1QixRQUF2QixFQUFpQztBQUMzRCxtQkFBVyxZQUFZLENBQXZCO0FBQ0EsZUFBTyxLQUFLLE9BQUwsQ0FBYSxZQUFiLEVBQTJCLFFBQTNCLE1BQXlDLFFBQWhEO0FBQ0gsS0FIRDtBQUlIOztBQUVELElBQUssT0FBTyxPQUFPLFdBQWQsS0FBOEIsVUFBbkMsRUFBZ0Q7QUFBQSxRQUNuQyxXQURtQyxHQUM1QyxTQUFTLFdBQVQsQ0FBcUIsS0FBckIsRUFBNEIsTUFBNUIsRUFBb0M7QUFDaEMsaUJBQVMsVUFBVSxFQUFDLFNBQVMsS0FBVixFQUFpQixZQUFZLEtBQTdCLEVBQW9DLFFBQVEsU0FBNUMsRUFBbkI7QUFDQSxZQUFJLE1BQU0sU0FBUyxXQUFULENBQXFCLGFBQXJCLENBQVY7QUFDQSxZQUFJLGVBQUosQ0FBb0IsS0FBcEIsRUFBMkIsT0FBTyxPQUFsQyxFQUEyQyxPQUFPLFVBQWxELEVBQThELE9BQU8sTUFBckU7QUFDQSxlQUFPLEdBQVA7QUFDSCxLQU4yQzs7QUFRNUMsZ0JBQVksU0FBWixHQUF3QixPQUFPLEtBQVAsQ0FBYSxTQUFyQzs7QUFFQSxXQUFPLFdBQVAsR0FBcUIsV0FBckI7QUFDSDs7Ozs7QUNyQkQ7OztBQUdBOzs7Ozs7O0FBT0EsSUFBSSxRQUFRLFNBQVIsS0FBUSxDQUFVLFNBQVYsRUFBcUIsT0FBckIsRUFBOEI7QUFDdEMsUUFBSSxPQUFPLElBQVg7QUFDQSxTQUFLLE9BQUwsR0FBZSxXQUFXLHlCQUExQjs7QUFFQSxTQUFLLFNBQUwsR0FBaUIsU0FBakI7O0FBRUEsU0FBSyxXQUFMLEdBQW1CLFVBQVUsTUFBVixFQUFrQixPQUFsQixFQUEyQixLQUEzQixFQUFrQztBQUNqRCxZQUFJLElBQUksSUFBSSxjQUFKLEVBQVI7QUFDQSxVQUFFLGVBQUYsR0FBb0IsSUFBcEI7QUFDQSxVQUFFLElBQUYsQ0FBTyxPQUFPLE1BQWQsRUFBc0IsS0FBSyxPQUFMLEdBQWUsT0FBTyxRQUE1QyxFQUFzRCxJQUF0RDtBQUNBLFVBQUUsa0JBQUYsR0FBdUIsWUFBWTtBQUMvQixnQkFBSSxFQUFFLFVBQUYsSUFBZ0IsQ0FBcEIsRUFBdUI7QUFDbkIsb0JBQUksRUFBRSxNQUFGLElBQVksR0FBaEIsRUFBcUI7QUFDakIsNEJBQVEsS0FBSyxLQUFMLENBQVcsRUFBRSxZQUFiLENBQVI7QUFDSCxpQkFGRCxNQUVPO0FBQ0gsd0JBQUksRUFBRSxZQUFOLEVBQW9CO0FBQ2hCLDhCQUFNLEtBQUssS0FBTCxDQUFXLEVBQUUsWUFBYixDQUFOO0FBQ0gscUJBRkQsTUFFTztBQUNILDhCQUFNLEVBQUMsT0FBTyxFQUFDLFNBQVMsa0JBQVYsRUFBOEIsTUFBTSxFQUFFLE1BQXRDLEVBQVIsRUFBTjtBQUNIO0FBQ0o7QUFDSjtBQUNKLFNBWkQ7QUFhQSxZQUFJLE9BQU8sTUFBUCxJQUFpQixNQUFyQixFQUE2QjtBQUN6QixjQUFFLGdCQUFGLENBQW1CLGNBQW5CLEVBQW1DLGdDQUFuQztBQUNBLGNBQUUsSUFBRixDQUFPLE9BQU8sUUFBZDtBQUNILFNBSEQsTUFHTyxJQUFJLE9BQU8sTUFBUCxJQUFpQixLQUFyQixFQUE0QjtBQUMvQixjQUFFLElBQUYsQ0FBTyxPQUFPLFlBQWQ7QUFDSDtBQUNKLEtBdkJEO0FBd0JILENBOUJEO0FBK0JBOzs7Ozs7QUFNQSxNQUFNLFNBQU4sQ0FBZ0IsY0FBaEIsR0FBaUMsVUFBVSxPQUFWLEVBQW1CLEtBQW5CLEVBQTBCLFlBQTFCLEVBQXdDO0FBQ3JFLFFBQUksTUFBTSxFQUFWO0FBQ0EsU0FBSyxJQUFJLEdBQVQsSUFBZ0IsWUFBaEIsRUFBOEI7QUFDMUIsWUFBSSxPQUFPLEVBQVgsRUFBZTtBQUNYLG1CQUFPLEdBQVA7QUFDSDtBQUNELGVBQU8sTUFBTSxHQUFOLEdBQVksbUJBQW1CLGFBQWEsR0FBYixDQUFuQixDQUFuQjtBQUNIOztBQUVELFdBQU8sS0FBSyxXQUFMLENBQWlCLEVBQUMsUUFBUSxLQUFULEVBQWdCLFVBQVUsdUJBQXVCLEdBQWpELEVBQXNELGNBQWMsSUFBcEUsRUFBakIsRUFBNEYsT0FBNUYsRUFBcUcsS0FBckcsQ0FBUDtBQUNILENBVkQ7O0FBWUEsTUFBTSxTQUFOLENBQWdCLGFBQWhCLEdBQWdDLFVBQVUsS0FBVixFQUFpQixJQUFqQixFQUF1QixVQUF2QixFQUFtQyxXQUFuQyxFQUFnRCxPQUFoRCxFQUF5RCxLQUF6RCxFQUFnRTtBQUM1RixRQUFJLE9BQU87QUFDUCxrQkFBVSxLQURIO0FBRVAsa0JBQVUsSUFGSDtBQUdQLHFCQUFhO0FBSE4sS0FBWDtBQUtBLFdBQU8sS0FBSyxXQUFMLENBQWlCLEVBQUMsUUFBUSxNQUFULEVBQWlCLFVBQVUsMkJBQXlCLEtBQUssU0FBOUIsR0FBMEMsZ0JBQTFDLEdBQTZELG1CQUFtQixXQUFuQixDQUF4RixFQUF5SCxVQUFVLEtBQUssU0FBTCxDQUFlLElBQWYsQ0FBbkksRUFBakIsRUFBMkssT0FBM0ssRUFBb0wsS0FBcEwsQ0FBUDtBQUNILENBUEQ7O0FBU0EsTUFBTSxTQUFOLENBQWdCLE9BQWhCLEdBQTBCLFVBQVUsV0FBVixFQUF1QixPQUF2QixFQUFnQyxLQUFoQyxFQUF1QztBQUM3RCxXQUFPLEtBQUssV0FBTCxDQUFpQixFQUFDLFFBQVEsS0FBVCxFQUFnQixVQUFVLEtBQTFCLEVBQWlDLGNBQWMsaUJBQWlCLFdBQWhFLEVBQWpCLEVBQStGLE9BQS9GLEVBQXdHLEtBQXhHLENBQVA7QUFDSCxDQUZEOztBQUlBLE9BQU8sT0FBUCxHQUFpQixLQUFqQjs7Ozs7Ozs7O0FDbkVBOzs7Ozs7OztBQUxBOzs7QUFHQSxRQUFRLFlBQVI7O0FBR0E7Ozs7Ozs7QUFPQSxJQUFNLGlCQUFpQjtBQUNuQixrQkFBYyxzQkFBVSxDQUFWLEVBQWEsQ0FDMUIsQ0FGa0I7QUFHbkIsd0JBQW9CLDRCQUFVLENBQVYsRUFBYSxDQUFiLEVBQWdCO0FBQ2hDLGVBQU8sSUFBUDtBQUNILEtBTGtCO0FBTW5CLG9DQUFnQyxLQU5iO0FBT25CLFlBQVEseUJBUFc7QUFRbkIscUJBQWlCLEVBUkU7QUFTbkIsaUJBQWEsS0FUTTtBQVVuQixXQUFPLGlCQVZZO0FBV25CLGVBQVc7QUFYUSxDQUF2Qjs7QUFjQSxJQUFNLDJCQUEyQixDQUFqQztBQUNBLElBQU0seUNBQXlDLENBQS9DOztJQUVNLEU7QUFDRixrQkFBYztBQUFBOztBQUNWLGFBQUssVUFBTCxHQUFrQixFQUFsQjtBQUNBLGFBQUssVUFBTCxHQUFrQjtBQUNkLGtCQUFNLE1BRFE7QUFFZCxtQkFBTztBQUZPLFNBQWxCOztBQUtBLGFBQUssTUFBTCxHQUFjO0FBQ1YsbUJBQU8sRUFERztBQUVWLDBCQUFjLGNBRko7QUFHViw4QkFBa0IsZ0JBSFI7QUFJVix5QkFBYTtBQUpILFNBQWQ7O0FBT0EsYUFBSyxVQUFMLEdBQWtCLFNBQVMsYUFBVCxDQUF1QixLQUF2QixDQUFsQjtBQUNIOzs7OzZCQUVJLE8sRUFBUztBQUFBOztBQUNWLGlCQUFLLE1BQUwsR0FBYyxTQUFjLEVBQWQsRUFBa0IsY0FBbEIsRUFBa0MsT0FBbEMsQ0FBZDtBQUNBLGlCQUFLLEdBQUwsR0FBVyxvQkFBVSxRQUFRLFNBQWxCLEVBQTZCLEtBQUssTUFBTCxDQUFZLE1BQXpDLENBQVg7O0FBRUEsbUJBQU8sSUFBUCxDQUFZLEtBQUssVUFBakIsRUFBNkIsR0FBN0IsQ0FBaUMsVUFBQyxRQUFELEVBQWM7QUFDM0Msc0JBQUssRUFBTCxDQUFRLE1BQUssVUFBTCxDQUFnQixRQUFoQixDQUFSO0FBQ0gsYUFGRDs7QUFJQSxnQkFBSSxDQUFDLEtBQUssTUFBTCxDQUFZLFdBQWpCLEVBQThCO0FBNEIxQjtBQTVCMEIsb0JBNkJqQixZQTdCaUIsR0E2QjFCLFNBQVMsWUFBVCxDQUFzQixFQUF0QixFQUEwQjtBQUN0Qix3QkFBSSxHQUFHLFVBQUgsQ0FBYyxjQUFkLENBQUosRUFBbUM7QUFDL0IsK0JBQU8sRUFBUDtBQUNIO0FBQ0Qsd0JBQUksSUFBSSxDQUFSO0FBQ0EsMkJBQU8sQ0FBQyxLQUFLLEdBQUcsYUFBVCxLQUEyQixDQUFDLEdBQUcsVUFBSCxDQUFjLGNBQWQsQ0FBNUIsSUFBNkQsRUFBRSxDQUFGLEdBQU0sYUFBMUU7QUFDQSwyQkFBTyxFQUFQO0FBQ0gsaUJBcEN5Qjs7QUFFMUIsb0JBQUksU0FBUyxFQUFiO0FBQ0EsdUJBQU8sU0FBUCxHQUFtQixRQUFRLFNBQTNCO0FBQ0Esb0JBQUksS0FBSyxNQUFMLENBQVksV0FBaEIsRUFBNkI7QUFDekIsMkJBQU8sWUFBUCxHQUFzQixLQUFLLE1BQUwsQ0FBWSxXQUFsQztBQUNIO0FBQ0Qsb0JBQUksS0FBSyxNQUFMLENBQVksUUFBaEIsRUFBMEI7QUFDdEIsMkJBQU8sU0FBUCxHQUFtQixLQUFLLE1BQUwsQ0FBWSxRQUEvQjtBQUNIOztBQUVELG9CQUFNLG9CQUFvQixTQUFwQixpQkFBb0IsR0FBTTtBQUM1QiwwQkFBSyxHQUFMLENBQVMsY0FBVCxDQUF3QixVQUFDLFFBQUQsRUFBYztBQUNsQyw4QkFBSyxVQUFMLEdBQWtCLEVBQWxCO0FBQ0EsNkJBQUssSUFBSSxHQUFULElBQWdCLFFBQWhCLEVBQTBCO0FBQ3RCLGdDQUFJLFNBQVMsY0FBVCxDQUF3QixHQUF4QixDQUFKLEVBQWtDO0FBQzlCLHNDQUFLLFVBQUwsQ0FBZ0IsUUFBUSxHQUF4QixJQUErQixTQUFTLEdBQVQsQ0FBL0I7QUFDSDtBQUNKO0FBQ0oscUJBUEQsRUFPRyxVQUFDLENBQUQsRUFBTztBQUNOLGdDQUFRLEtBQVIsQ0FBYyxDQUFkO0FBQ0gscUJBVEQsRUFTRyxNQVRIO0FBVUgsaUJBWEQ7O0FBYUE7QUFDQSw0QkFBWSxpQkFBWixFQUErQixPQUFPLEVBQVAsR0FBWSxFQUEzQzs7QUFFQSxvQkFBTSxnQkFBZ0IsS0FBSyxNQUFMLENBQVksZUFBbEM7O0FBV0Esb0JBQUksS0FBSyxNQUFMLENBQVksOEJBQWhCLEVBQWdEO0FBQzVDLDZCQUFTLGdCQUFULENBQTBCLE9BQTFCLEVBQW1DLFVBQUMsQ0FBRCxFQUFPO0FBQ3RDLDRCQUFNLFNBQVMsYUFBYSxFQUFFLE1BQWYsQ0FBZjtBQUNBO0FBQ0EsNEJBQUksQ0FBQyxNQUFMLEVBQWE7QUFDVDtBQUNIO0FBQ0QsNEJBQU0sU0FBUyxPQUFPLFVBQVAsQ0FBa0IsY0FBbEIsQ0FBZjtBQUNBLDRCQUFJLE1BQUosRUFBWTtBQUNSLGdDQUFJLFlBQVksT0FBTyxTQUF2QjtBQUNBLGdDQUFJLFNBQUosRUFBZTtBQUNYLHNDQUFLLEtBQUwsQ0FBVyxFQUFDLFVBQVUsU0FBWCxFQUFYO0FBQ0g7QUFDSjtBQUNKLHFCQWJEO0FBY0g7QUFDSjtBQUNKOztBQUVEOzs7Ozs7Ozs7OEJBTU0sSSxFQUFNLEssRUFBTyxPLEVBQVM7QUFBQTs7QUFFeEIsZ0JBQUksQ0FBQyxJQUFELElBQVMsQ0FBQyxLQUFLLFVBQW5CLEVBQStCO0FBQzNCO0FBQ0g7O0FBRUQ7Ozs7QUFJQSxnQkFBSSxLQUFLLFFBQVQsRUFBbUI7QUFDZixvQkFBSSxLQUFLLFFBQUwsQ0FBYyxVQUFkLENBQXlCLEtBQXpCLENBQUosRUFBcUM7QUFDakMsd0JBQU0sWUFBWSxLQUFLLFVBQUwsQ0FBZ0IsS0FBSyxRQUFyQixDQUFsQjtBQUNBLHdCQUFJLGFBQWEsU0FBakIsRUFBNEI7QUFDeEIsK0JBQU8sUUFBUCxDQUFnQixJQUFoQixHQUF1QixLQUFLLFVBQUwsQ0FBZ0IsS0FBSyxRQUFyQixDQUF2QjtBQUNILHFCQUZELE1BRU87QUFDSCxnQ0FBUSxLQUFSLENBQWMsZ0JBQWdCLEtBQUssUUFBckIsR0FBZ0MsaUJBQTlDO0FBQ0g7QUFFSixpQkFSRCxNQVFPLElBQUksS0FBSyxRQUFMLElBQWlCLFlBQXJCLEVBQW1DO0FBQ3RDLHlCQUFLLEdBQUwsQ0FBUyxhQUFULENBQXVCLEtBQUssS0FBNUIsRUFBbUMsS0FBSyxJQUF4QyxFQUE4QyxLQUFLLFVBQW5ELEVBQStELEtBQUssTUFBTCxDQUFZLFdBQTNFLEVBQXdGLFVBQUMsR0FBRCxFQUFTO0FBQzdGLDRCQUFJLElBQUksU0FBUixFQUFtQjtBQUNmLGdDQUFNLGFBQWEsU0FBYixVQUFhLEdBQVk7QUFDM0IsdUNBQU8sUUFBUCxDQUFnQixJQUFoQixHQUF1QixJQUFJLFNBQTNCO0FBQ0gsNkJBRkQ7QUFHQSxnQ0FBSSxPQUFKLEVBQWE7QUFDVCx3Q0FBUSxFQUFDLFFBQVEsU0FBVCxFQUFvQixRQUFRLFVBQTVCLEVBQXdDLGFBQWEsSUFBSSxTQUF6RCxFQUFSO0FBQ0gsNkJBRkQsTUFFTztBQUNIO0FBQ0g7QUFDSix5QkFURCxNQVNPO0FBQ0gsa0NBQU0sT0FBSyxpQkFBTCxDQUF1Qix5QkFBdkIsRUFBa0Qsc0NBQWxELENBQU47QUFDSDtBQUNKLHFCQWJELEVBYUcsVUFBVSxHQUFWLEVBQWU7QUFDZCw4QkFBTSxHQUFOO0FBQ0gscUJBZkQ7QUFnQkgsaUJBakJNLE1BaUJBLElBQUksS0FBSyxRQUFMLElBQWlCLEtBQXJCLEVBQTRCO0FBQy9CLHdCQUFJLGVBQWUsT0FBbkIsRUFBNEI7QUFDeEIsNkJBQUssR0FBTCxDQUFTLE9BQVQsQ0FBaUIsS0FBSyxXQUF0QixFQUFtQyxJQUFuQyxFQUF5QyxJQUF6QztBQUNILHFCQUZELE1BRU8sSUFBSSxlQUFlLE1BQW5CLEVBQTJCLENBRWpDO0FBQ0osaUJBTk0sTUFNQTtBQUNILDRCQUFRLEtBQVIsQ0FBYyxtQkFBZDtBQUNIO0FBQ0o7QUFDSjs7OzBDQUVpQixPLEVBQVMsSSxFQUFNO0FBQzdCLG1CQUFPO0FBQ0gsdUJBQU87QUFDSCw2QkFBUyxPQUROO0FBRUgsMEJBQU0sUUFBUSxDQUFDO0FBRlo7QUFESixhQUFQO0FBTUg7Ozt1Q0FFYztBQUNYLG1CQUFPLEtBQUssTUFBTCxDQUFZLFNBQW5CO0FBQ0g7Ozt5Q0FFZ0I7QUFDYixtQkFBTyxLQUFLLE1BQUwsQ0FBWSxXQUFuQjtBQUNIOzs7bUNBRVU7QUFDUCxtQkFBTyxLQUFLLE1BQUwsQ0FBWSxLQUFuQjtBQUNIOzs7c0NBRWE7QUFDVixtQkFBTyxLQUFLLE1BQUwsQ0FBWSxRQUFuQjtBQUNIOzs7bUNBRVUsUyxFQUFXLE8sRUFBUztBQUFBOztBQUMzQixnQkFBSSxLQUFLLEdBQVQsRUFBYztBQUNWLG9CQUFJLENBQUMsU0FBTCxFQUFnQjtBQUNaLDRCQUFRLEtBQVIsQ0FBYyxjQUFkO0FBQ0gsaUJBRkQsTUFFTztBQUNILHdCQUFJLFdBQVcsU0FBZixFQUEwQjtBQUN0QixrQ0FBVSxFQUFWO0FBQ0g7QUFDRCx3QkFBTSxTQUFXLFFBQVEsS0FBUixJQUFpQixHQUE1QixRQUFOO0FBQ0Esd0JBQU0sVUFBWSxRQUFRLE1BQVIsSUFBa0IsR0FBOUIsUUFBTjs7QUFFQSx3QkFBTSxnQkFBZ0IsUUFBUSxhQUFSLElBQXlCLCtCQUEvQzs7QUFFQSx3QkFBTSxRQUFRLFFBQVEsS0FBUixJQUFpQixLQUFLLE1BQUwsQ0FBWSxLQUEzQzs7QUFFQSx3QkFBSSxNQUFNLGdCQUFnQixLQUFoQixHQUF3QixhQUF4QixHQUF3QyxLQUFLLFlBQUwsRUFBbEQ7O0FBRUEsd0JBQUksS0FBSyxNQUFMLENBQVksTUFBaEIsRUFBd0I7QUFDcEIsOEJBQU0sTUFBTSxVQUFOLEdBQW1CLEtBQUssTUFBTCxDQUFZLE1BQXJDO0FBQ0g7QUFDRCx3QkFBSSxLQUFLLE1BQUwsQ0FBWSxNQUFoQixFQUF3QjtBQUNwQiw4QkFBTSxNQUFNLFVBQU4sR0FBbUIsS0FBSyxNQUFMLENBQVksTUFBckM7QUFDSDtBQUNELHdCQUFNLGNBQWMsS0FBSyxjQUFMLEVBQXBCO0FBQ0Esd0JBQUksV0FBSixFQUFpQjtBQUNiLDhCQUFNLE1BQU0sZUFBTixHQUF3QixtQkFBbUIsV0FBbkIsQ0FBOUI7QUFDSDs7QUFFRCx3QkFBTSxXQUFXLEtBQUssV0FBTCxFQUFqQjtBQUNBLHdCQUFJLFFBQUosRUFBYztBQUNULDhCQUFNLE1BQU0sYUFBTixHQUFzQixtQkFBbUIsUUFBbkIsQ0FBNUI7QUFDSjs7QUFFRCx3QkFBTSxRQUFRLEtBQUssUUFBTCxFQUFkO0FBQ0Esd0JBQUksS0FBSixFQUFXO0FBQ1AsOEJBQU0sTUFBTSxTQUFOLEdBQWtCLG1CQUFtQixLQUFuQixDQUF4QjtBQUNIOztBQUVELHdCQUFNLGVBQWUsU0FBUyxhQUFULENBQXVCLFFBQXZCLENBQXJCO0FBQ0EsaUNBQWEsTUFBYixHQUFzQixZQUFNO0FBQ3hCLGlDQUFRLFdBQVIsQ0FBb0IsVUFBcEI7QUFDQSxxQ0FBYSxLQUFiLENBQW1CLEtBQW5CLEdBQTJCLE1BQTNCO0FBQ0EscUNBQWEsS0FBYixDQUFtQixNQUFuQixHQUE0QixNQUE1QjtBQUNBLDRCQUFJLFFBQVEsSUFBSSxXQUFKLENBQWdCLE1BQWhCLENBQVo7QUFDQSwrQkFBSyxVQUFMLENBQWdCLGFBQWhCLENBQThCLEtBQTlCO0FBQ0gscUJBTkQ7QUFPQSxpQ0FBYSxLQUFiLENBQW1CLEtBQW5CLEdBQTJCLENBQTNCO0FBQ0EsaUNBQWEsS0FBYixDQUFtQixNQUFuQixHQUE0QixDQUE1QjtBQUNBLGlDQUFhLFdBQWIsR0FBMkIsR0FBM0I7QUFDQSxpQ0FBYSxHQUFiLEdBQW1CLEdBQW5CO0FBQ0EsaUNBQWEsRUFBYixHQUFrQix5QkFBbEI7O0FBRUEsd0JBQU0sY0FBYyxPQUFPLGdCQUFQLEdBQTBCLGtCQUExQixHQUErQyxhQUFuRTtBQUNBLHdCQUFNLFVBQVUsT0FBTyxXQUFQLENBQWhCO0FBQ0Esd0JBQU0sZUFBZSxlQUFlLGFBQWYsR0FBK0IsV0FBL0IsR0FBNkMsU0FBbEU7O0FBRUE7QUFDQSw0QkFBUSxZQUFSLEVBQXNCLFVBQUMsQ0FBRCxFQUFPO0FBQ3pCLDRCQUFJLFFBQVEsSUFBSSxXQUFKLENBQWdCLE9BQUssVUFBTCxDQUFnQixFQUFFLElBQWxCLENBQWhCLENBQVo7QUFDQSwrQkFBSyxVQUFMLENBQWdCLGFBQWhCLENBQThCLEtBQTlCO0FBQ0gscUJBSEQsRUFHRyxLQUhIOztBQUtBLHdCQUFNLGFBQVksU0FBUyxhQUFULENBQXVCLEtBQXZCLENBQWxCOztBQUVBLCtCQUFVLFNBQVYsR0FBc0IsS0FBSyxNQUFMLENBQVksU0FBbEM7O0FBRUEsd0JBQU0sV0FBVSxTQUFTLGNBQVQsQ0FBd0IsU0FBeEIsQ0FBaEI7QUFDQSx3QkFBSSxRQUFKLEVBQWE7QUFDVCxpQ0FBUSxLQUFSLENBQWMsS0FBZCxHQUFzQixLQUF0QjtBQUNBLGlDQUFRLEtBQVIsQ0FBYyxNQUFkLEdBQXVCLE1BQXZCO0FBQ0EsaUNBQVEsV0FBUixDQUFvQixVQUFwQjtBQUNBLGlDQUFRLFdBQVIsQ0FBb0IsWUFBcEI7QUFDSCxxQkFMRCxNQUtPO0FBQ0gsZ0NBQVEsS0FBUixDQUFjLGVBQWUsU0FBZixHQUEyQixlQUF6QztBQUNIO0FBRUo7QUFDSixhQTVFRCxNQTRFTztBQUNILHdCQUFRLEtBQVIsQ0FBYyw0QkFBZDtBQUNIO0FBQ0o7Ozt1Q0FFYztBQUNYLGdCQUFJLFVBQVUsU0FBUyxjQUFULENBQXdCLHlCQUF4QixDQUFkO0FBQ0Esb0JBQVEsVUFBUixDQUFtQixXQUFuQixDQUErQixPQUEvQjtBQUNIOztBQUVEOzs7Ozs7OzsyQkFNRyxLLEVBQU8sTyxFQUFTO0FBQ2Ysc0JBQVUsV0FBVyxJQUFyQjs7QUFFQSxnQkFBSSxVQUFVLEtBQUssVUFBTCxDQUFnQixLQUE5QixFQUFxQztBQUNqQyxvQkFBSSxDQUFDLE9BQUwsRUFBYztBQUNWLDhCQUFVLEtBQUssWUFBZjtBQUNILGlCQUZELE1BR0s7QUFDRCx5QkFBSyxVQUFMLENBQWdCLG1CQUFoQixDQUFvQyxLQUFwQyxFQUEyQyxLQUFLLFlBQWhEO0FBQ0g7QUFDSjs7QUFFRCxpQkFBSyxVQUFMLENBQWdCLGdCQUFoQixDQUFpQyxLQUFqQyxFQUF3QyxPQUF4QztBQUNIOzs7Ozs7QUFHTCxJQUFNLFNBQVMsSUFBSSxFQUFKLEVBQWY7O0FBRUEsT0FBTyxPQUFQLEdBQWlCLE1BQWpCIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogQ3JlYXRlZCBieSBhLmtvcm90YWV2IG9uIDA3LjExLjE2LlxuICovXG5pZiAoIVN0cmluZy5wcm90b3R5cGUuc3RhcnRzV2l0aCkge1xuICAgIFN0cmluZy5wcm90b3R5cGUuc3RhcnRzV2l0aCA9IGZ1bmN0aW9uKHNlYXJjaFN0cmluZywgcG9zaXRpb24pIHtcbiAgICAgICAgcG9zaXRpb24gPSBwb3NpdGlvbiB8fCAwO1xuICAgICAgICByZXR1cm4gdGhpcy5pbmRleE9mKHNlYXJjaFN0cmluZywgcG9zaXRpb24pID09PSBwb3NpdGlvbjtcbiAgICB9O1xufVxuXG5pZiAoIHR5cGVvZiB3aW5kb3cuQ3VzdG9tRXZlbnQgIT09IFwiZnVuY3Rpb25cIiApIHtcbiAgICBmdW5jdGlvbiBDdXN0b21FdmVudChldmVudCwgcGFyYW1zKSB7XG4gICAgICAgIHBhcmFtcyA9IHBhcmFtcyB8fCB7YnViYmxlczogZmFsc2UsIGNhbmNlbGFibGU6IGZhbHNlLCBkZXRhaWw6IHVuZGVmaW5lZH07XG4gICAgICAgIHZhciBldnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnQ3VzdG9tRXZlbnQnKTtcbiAgICAgICAgZXZ0LmluaXRDdXN0b21FdmVudChldmVudCwgcGFyYW1zLmJ1YmJsZXMsIHBhcmFtcy5jYW5jZWxhYmxlLCBwYXJhbXMuZGV0YWlsKTtcbiAgICAgICAgcmV0dXJuIGV2dDtcbiAgICB9XG5cbiAgICBDdXN0b21FdmVudC5wcm90b3R5cGUgPSB3aW5kb3cuRXZlbnQucHJvdG90eXBlO1xuXG4gICAgd2luZG93LkN1c3RvbUV2ZW50ID0gQ3VzdG9tRXZlbnQ7XG59IiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGEua29yb3RhZXYgb24gMjQuMDYuMTYuXG4gKi9cbi8qKlxuICogSW1wZWxlbWVudHMgWHNvbGxhIExvZ2luIEFwaVxuICogQHBhcmFtIHByb2plY3RJZCAtIHByb2plY3QncyB1bmlxdWUgaWRlbnRpZmllclxuICogQHBhcmFtIGJhc2VVcmwgLSBhcGkgZW5kcG9pbnRcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5cbnZhciBYTEFwaSA9IGZ1bmN0aW9uIChwcm9qZWN0SWQsIGJhc2VVcmwpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5iYXNlVXJsID0gYmFzZVVybCB8fCAnLy9sb2dpbi54c29sbGEuY29tL2FwaS8nO1xuXG4gICAgdGhpcy5wcm9qZWN0SWQgPSBwcm9qZWN0SWQ7XG5cbiAgICB0aGlzLm1ha2VBcGlDYWxsID0gZnVuY3Rpb24gKHBhcmFtcywgc3VjY2VzcywgZXJyb3IpIHtcbiAgICAgICAgdmFyIHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgICAgci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlO1xuICAgICAgICByLm9wZW4ocGFyYW1zLm1ldGhvZCwgc2VsZi5iYXNlVXJsICsgcGFyYW1zLmVuZHBvaW50LCB0cnVlKTtcbiAgICAgICAgci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoci5yZWFkeVN0YXRlID09IDQpIHtcbiAgICAgICAgICAgICAgICBpZiAoci5zdGF0dXMgPT0gMjAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3MoSlNPTi5wYXJzZShyLnJlc3BvbnNlVGV4dCkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyLnJlc3BvbnNlVGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3IoSlNPTi5wYXJzZShyLnJlc3BvbnNlVGV4dCkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3Ioe2Vycm9yOiB7bWVzc2FnZTogJ05ldHdvcmtpbmcgZXJyb3InLCBjb2RlOiByLnN0YXR1c319KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgaWYgKHBhcmFtcy5tZXRob2QgPT0gJ1BPU1QnKSB7XG4gICAgICAgICAgICByLnNldFJlcXVlc3RIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLThcIik7XG4gICAgICAgICAgICByLnNlbmQocGFyYW1zLnBvc3RCb2R5KTtcbiAgICAgICAgfSBlbHNlIGlmIChwYXJhbXMubWV0aG9kID09ICdHRVQnKSB7XG4gICAgICAgICAgICByLnNlbmQocGFyYW1zLmdldEFyZ3VtZW50cyk7XG4gICAgICAgIH1cbiAgICB9O1xufTtcbi8qKlxuICogR2V0IGFsbCBhdmlhbGFibGUgc29jaWFsIG1ldGhvZHMgYXV0aCB1cmxcbiAqIEBwYXJhbSBzdWNjZXNzIC0gc3VjY2VzcyBjYWxsYmFja1xuICogQHBhcmFtIGVycm9yIC0gZXJyb3IgY2FsbGJhY2tcbiAqIEBwYXJhbSBnZXRBcmd1bWVudHMgLSBhZGRpdGlvbmFsIHBhcmFtcyB0byBzZW5kIHdpdGggcmVxdWVzdFxuICovXG5YTEFwaS5wcm90b3R5cGUuZ2V0U29jaWFsc1VSTHMgPSBmdW5jdGlvbiAoc3VjY2VzcywgZXJyb3IsIGdldEFyZ3VtZW50cykge1xuICAgIHZhciBzdHIgPSBcIlwiO1xuICAgIGZvciAodmFyIGtleSBpbiBnZXRBcmd1bWVudHMpIHtcbiAgICAgICAgaWYgKHN0ciAhPSBcIlwiKSB7XG4gICAgICAgICAgICBzdHIgKz0gXCImXCI7XG4gICAgICAgIH1cbiAgICAgICAgc3RyICs9IGtleSArIFwiPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGdldEFyZ3VtZW50c1trZXldKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5tYWtlQXBpQ2FsbCh7bWV0aG9kOiAnR0VUJywgZW5kcG9pbnQ6ICdzb2NpYWwvbG9naW5fdXJscz8nICsgc3RyLCBnZXRBcmd1bWVudHM6IG51bGx9LCBzdWNjZXNzLCBlcnJvcik7XG59O1xuXG5YTEFwaS5wcm90b3R5cGUubG9naW5QYXNzQXV0aCA9IGZ1bmN0aW9uIChsb2dpbiwgcGFzcywgcmVtZW1iZXJNZSwgcmVkaXJlY3RVcmwsIHN1Y2Nlc3MsIGVycm9yKSB7XG4gICAgdmFyIGJvZHkgPSB7XG4gICAgICAgIHVzZXJuYW1lOiBsb2dpbixcbiAgICAgICAgcGFzc3dvcmQ6IHBhc3MsXG4gICAgICAgIHJlbWVtYmVyX21lOiByZW1lbWJlck1lXG4gICAgfTtcbiAgICByZXR1cm4gdGhpcy5tYWtlQXBpQ2FsbCh7bWV0aG9kOiAnUE9TVCcsIGVuZHBvaW50OiAncHJveHkvbG9naW4/cHJvamVjdElkPScrdGhpcy5wcm9qZWN0SWQgKyAnJnJlZGlyZWN0X3VybD0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHJlZGlyZWN0VXJsKSwgcG9zdEJvZHk6IEpTT04uc3RyaW5naWZ5KGJvZHkpfSwgc3VjY2VzcywgZXJyb3IpO1xufTtcblxuWExBcGkucHJvdG90eXBlLnNtc0F1dGggPSBmdW5jdGlvbiAocGhvbmVOdW1iZXIsIHN1Y2Nlc3MsIGVycm9yKSB7XG4gICAgcmV0dXJuIHRoaXMubWFrZUFwaUNhbGwoe21ldGhvZDogJ0dFVCcsIGVuZHBvaW50OiAnc21zJywgZ2V0QXJndW1lbnRzOiAncGhvbmVOdW1iZXI9JyArIHBob25lTnVtYmVyfSwgc3VjY2VzcywgZXJyb3IpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBYTEFwaTtcbiIsIi8qKlxuICogQ3JlYXRlZCBieSBhLmtvcm90YWV2IG9uIDI0LjA2LjE2LlxuICovXG5yZXF1aXJlKCcuL3N1cHBvcnRzJyk7XG5cbmltcG9ydCBYTEFwaSBmcm9tICcuL3hsYXBpJztcbi8qKlxuICogQ3JlYXRlIGFuIGBBdXRoMGAgaW5zdGFuY2Ugd2l0aCBgb3B0aW9uc2BcbiAqXG4gKiBAY2xhc3MgWExcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5cbmNvbnN0IERFRkFVTFRfQ09ORklHID0ge1xuICAgIGVycm9ySGFuZGxlcjogZnVuY3Rpb24gKGEpIHtcbiAgICB9LFxuICAgIGxvZ2luUGFzc1ZhbGlkYXRvcjogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcbiAgICBpc01hcmt1cFNvY2lhbHNIYW5kbGVyc0VuYWJsZWQ6IGZhbHNlLFxuICAgIGFwaVVybDogJy8vbG9naW4ueHNvbGxhLmNvbS9hcGkvJyxcbiAgICBtYXhYTENsaWNrRGVwdGg6IDIwLFxuICAgIG9ubHlXaWRnZXRzOiBmYWxzZSxcbiAgICB0aGVtZTogJ2FwcC5kZWZhdWx0LmNzcycsXG4gICAgcHJlbG9hZGVyOiAnPGRpdj48L2Rpdj4nXG59O1xuXG5jb25zdCBJTlZBTElEX0xPR0lOX0VSUk9SX0NPREUgPSAxO1xuY29uc3QgSU5DT1JSRUNUX0xPR0lOX09SX1BBU1NXT1JEX0VSUk9SX0NPREUgPSAyO1xuXG5jbGFzcyBYTCB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMuc29jaWFsVXJscyA9IHt9O1xuICAgICAgICB0aGlzLmV2ZW50VHlwZXMgPSB7XG4gICAgICAgICAgICBMT0FEOiAnbG9hZCcsXG4gICAgICAgICAgICBDTE9TRTogJ2Nsb3NlJ1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuUk9VVEVTID0ge1xuICAgICAgICAgICAgTE9HSU46ICcnLFxuICAgICAgICAgICAgUkVHSVNUUkFUSU9OOiAncmVnaXN0cmF0aW9uJyxcbiAgICAgICAgICAgIFJFQ09WRVJfUEFTU1dPUkQ6ICdyZXNldC1wYXNzd29yZCcsXG4gICAgICAgICAgICBBTExfU09DSUFMUzogJ290aGVycydcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmRpc3BhdGNoZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB9XG5cbiAgICBpbml0KG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5jb25maWcgPSBPYmplY3QuYXNzaWduKHt9LCBERUZBVUxUX0NPTkZJRywgb3B0aW9ucyk7XG4gICAgICAgIHRoaXMuYXBpID0gbmV3IFhMQXBpKG9wdGlvbnMucHJvamVjdElkLCB0aGlzLmNvbmZpZy5hcGlVcmwpO1xuXG4gICAgICAgIE9iamVjdC5rZXlzKHRoaXMuZXZlbnRUeXBlcykubWFwKChldmVudEtleSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5vbih0aGlzLmV2ZW50VHlwZXNbZXZlbnRLZXldKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCF0aGlzLmNvbmZpZy5vbmx5V2lkZ2V0cykge1xuXG4gICAgICAgICAgICBsZXQgcGFyYW1zID0ge307XG4gICAgICAgICAgICBwYXJhbXMucHJvamVjdElkID0gb3B0aW9ucy5wcm9qZWN0SWQ7XG4gICAgICAgICAgICBpZiAodGhpcy5jb25maWcucmVkaXJlY3RVcmwpIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMucmVkaXJlY3RfdXJsID0gdGhpcy5jb25maWcucmVkaXJlY3RVcmw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5jb25maWcubG9naW5VcmwpIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMubG9naW5fdXJsID0gdGhpcy5jb25maWcubG9naW5Vcmw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHVwZGF0ZVNvY2lhbExpbmtzID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuYXBpLmdldFNvY2lhbHNVUkxzKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNvY2lhbFVybHMgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQga2V5IGluIHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc29jaWFsVXJsc1snc24tJyArIGtleV0gPSByZXNwb25zZVtrZXldO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICAgICAgICAgICAgICB9LCBwYXJhbXMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdXBkYXRlU29jaWFsTGlua3MoKTtcbiAgICAgICAgICAgIHNldEludGVydmFsKHVwZGF0ZVNvY2lhbExpbmtzLCAxMDAwICogNjAgKiA1OSk7XG5cbiAgICAgICAgICAgIGNvbnN0IG1heENsaWNrRGVwdGggPSB0aGlzLmNvbmZpZy5tYXhYTENsaWNrRGVwdGg7XG4gICAgICAgICAgICAvLyBGaW5kIGNsb3Nlc3QgYW5jZXN0b3Igd2l0aCBkYXRhLXhsLWF1dGggYXR0cmlidXRlXG4gICAgICAgICAgICBmdW5jdGlvbiBmaW5kQW5jZXN0b3IoZWwpIHtcbiAgICAgICAgICAgICAgICBpZiAoZWwuYXR0cmlidXRlc1snZGF0YS14bC1hdXRoJ10pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBsZXQgaSA9IDA7XG4gICAgICAgICAgICAgICAgd2hpbGUgKChlbCA9IGVsLnBhcmVudEVsZW1lbnQpICYmICFlbC5hdHRyaWJ1dGVzWydkYXRhLXhsLWF1dGgnXSAmJiArK2kgPCBtYXhDbGlja0RlcHRoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZWw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy5pc01hcmt1cFNvY2lhbHNIYW5kbGVyc0VuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IGZpbmRBbmNlc3RvcihlLnRhcmdldCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIERvIG5vdGhpbmcgaWYgY2xpY2sgd2FzIG91dHNpZGUgb2YgZWxlbWVudHMgd2l0aCBkYXRhLXhsLWF1dGhcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0YXJnZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjb25zdCB4bERhdGEgPSB0YXJnZXQuYXR0cmlidXRlc1snZGF0YS14bC1hdXRoJ107XG4gICAgICAgICAgICAgICAgICAgIGlmICh4bERhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBub2RlVmFsdWUgPSB4bERhdGEubm9kZVZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGVWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubG9naW4oe2F1dGhUeXBlOiBub2RlVmFsdWV9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGVyZm9ybXMgbG9naW5cbiAgICAgKiBAcGFyYW0gcHJvcFxuICAgICAqIEBwYXJhbSBlcnJvciAtIGNhbGwgaW4gY2FzZSBlcnJvclxuICAgICAqIEBwYXJhbSBzdWNjZXNzXG4gICAgICovXG4gICAgbG9naW4ocHJvcCwgZXJyb3IsIHN1Y2Nlc3MpIHtcblxuICAgICAgICBpZiAoIXByb3AgfHwgIXRoaXMuc29jaWFsVXJscykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIHByb3BzXG4gICAgICAgICAqIGF1dGhUeXBlOiBzbi08c29jaWFsIG5hbWU+LCBsb2dpbi1wYXNzLCBzbXNcbiAgICAgICAgICovXG4gICAgICAgIGlmIChwcm9wLmF1dGhUeXBlKSB7XG4gICAgICAgICAgICBpZiAocHJvcC5hdXRoVHlwZS5zdGFydHNXaXRoKCdzbi0nKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNvY2lhbFVybCA9IHRoaXMuc29jaWFsVXJsc1twcm9wLmF1dGhUeXBlXTtcbiAgICAgICAgICAgICAgICBpZiAoc29jaWFsVXJsICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHRoaXMuc29jaWFsVXJsc1twcm9wLmF1dGhUeXBlXTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdBdXRoIHR5cGU6ICcgKyBwcm9wLmF1dGhUeXBlICsgJyBkb2VzblxcJ3QgZXhpc3QnKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcC5hdXRoVHlwZSA9PSAnbG9naW4tcGFzcycpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmFwaS5sb2dpblBhc3NBdXRoKHByb3AubG9naW4sIHByb3AucGFzcywgcHJvcC5yZW1lbWJlck1lLCB0aGlzLmNvbmZpZy5yZWRpcmVjdFVybCwgKHJlcykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzLmxvZ2luX3VybCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmluaXNoQXV0aCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHJlcy5sb2dpbl91cmw7XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzKHtzdGF0dXM6ICdzdWNjZXNzJywgZmluaXNoOiBmaW5pc2hBdXRoLCByZWRpcmVjdFVybDogcmVzLmxvZ2luX3VybH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaW5pc2hBdXRoKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcih0aGlzLmNyZWF0ZUVycm9yT2JqZWN0KCdMb2dpbiBvciBwYXNzIG5vdCB2YWxpZCcsIElOQ09SUkVDVF9MT0dJTl9PUl9QQVNTV09SRF9FUlJPUl9DT0RFKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yKGVycik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3AuYXV0aFR5cGUgPT0gJ3NtcycpIHtcbiAgICAgICAgICAgICAgICBpZiAoc21zQXV0aFN0ZXAgPT0gJ3Bob25lJykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmFwaS5zbXNBdXRoKHByb3AucGhvbmVOdW1iZXIsIG51bGwsIG51bGwpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc21zQXV0aFN0ZXAgPT0gJ2NvZGUnKSB7XG5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1Vua25vd24gYXV0aCB0eXBlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjcmVhdGVFcnJvck9iamVjdChtZXNzYWdlLCBjb2RlKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IG1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgY29kZTogY29kZSB8fCAtMVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH07XG5cbiAgICBnZXRQcm9qZWN0SWQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbmZpZy5wcm9qZWN0SWQ7XG4gICAgfTtcblxuICAgIGdldFJlZGlyZWN0VVJMKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jb25maWcucmVkaXJlY3RVcmw7XG4gICAgfTtcblxuICAgIGdldFRoZW1lKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jb25maWcudGhlbWU7XG4gICAgfVxuXG4gICAgZ2V0TG9naW5VcmwoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbmZpZy5sb2dpblVybDtcbiAgICB9O1xuXG4gICAgQXV0aFdpZGdldChlbGVtZW50SWQsIG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKHRoaXMuYXBpKSB7XG4gICAgICAgICAgICBpZiAoIWVsZW1lbnRJZCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ05vIGRpdiBuYW1lIScpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucyA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCB3aWR0aCA9IGAke29wdGlvbnMud2lkdGggfHwgNDAwfXB4YDtcbiAgICAgICAgICAgICAgICBjb25zdCBoZWlnaHQgPSBgJHtvcHRpb25zLmhlaWdodCB8fCA1NTB9cHhgO1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgd2lkZ2V0QmFzZVVybCA9IG9wdGlvbnMud2lkZ2V0QmFzZVVybCB8fCAnaHR0cHM6Ly94bC13aWRnZXQueHNvbGxhLmNvbS8nO1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgcm91dGUgPSBvcHRpb25zLnJvdXRlIHx8IHRoaXMuUk9VVEVTLkxPR0lOO1xuXG4gICAgICAgICAgICAgICAgbGV0IHNyYyA9IHdpZGdldEJhc2VVcmwgKyByb3V0ZSArICc/cHJvamVjdElkPScgKyB0aGlzLmdldFByb2plY3RJZCgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLmxvY2FsZSkge1xuICAgICAgICAgICAgICAgICAgICBzcmMgPSBzcmMgKyAnJmxvY2FsZT0nICsgdGhpcy5jb25maWcubG9jYWxlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jb25maWcuZmllbGRzKSB7XG4gICAgICAgICAgICAgICAgICAgIHNyYyA9IHNyYyArICcmZmllbGRzPScgKyB0aGlzLmNvbmZpZy5maWVsZHM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IHJlZGlyZWN0VXJsID0gdGhpcy5nZXRSZWRpcmVjdFVSTCgpO1xuICAgICAgICAgICAgICAgIGlmIChyZWRpcmVjdFVybCkge1xuICAgICAgICAgICAgICAgICAgICBzcmMgPSBzcmMgKyAnJnJlZGlyZWN0VXJsPScgKyBlbmNvZGVVUklDb21wb25lbnQocmVkaXJlY3RVcmwpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IGxvZ2luVXJsID0gdGhpcy5nZXRMb2dpblVybCgpO1xuICAgICAgICAgICAgICAgIGlmIChsb2dpblVybCkge1xuICAgICAgICAgICAgICAgICAgICAgc3JjID0gc3JjICsgJyZsb2dpbl91cmw9JyArIGVuY29kZVVSSUNvbXBvbmVudChsb2dpblVybCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgdGhlbWUgPSB0aGlzLmdldFRoZW1lKCk7XG4gICAgICAgICAgICAgICAgaWYgKHRoZW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIHNyYyA9IHNyYyArICcmdGhlbWU9JyArIGVuY29kZVVSSUNvbXBvbmVudCh0aGVtZSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3Qgd2lkZ2V0SWZyYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaWZyYW1lJyk7XG4gICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLm9ubG9hZCA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5yZW1vdmVDaGlsZChwcmVsb2FkZXIpO1xuICAgICAgICAgICAgICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUud2lkdGggPSAnMTAwJSc7XG4gICAgICAgICAgICAgICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS5oZWlnaHQgPSAnMTAwJSc7XG4gICAgICAgICAgICAgICAgICAgIGxldCBldmVudCA9IG5ldyBDdXN0b21FdmVudCgnbG9hZCcpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmRpc3BhdGNoZXIuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUud2lkdGggPSAwO1xuICAgICAgICAgICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS5oZWlnaHQgPSAwO1xuICAgICAgICAgICAgICAgIHdpZGdldElmcmFtZS5mcmFtZUJvcmRlciA9ICcwJztcbiAgICAgICAgICAgICAgICB3aWRnZXRJZnJhbWUuc3JjID0gc3JjO1xuICAgICAgICAgICAgICAgIHdpZGdldElmcmFtZS5pZCA9ICdYc29sbGFMb2dpbldpZGdldElmcmFtZSc7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBldmVudE1ldGhvZCA9IHdpbmRvdy5hZGRFdmVudExpc3RlbmVyID8gJ2FkZEV2ZW50TGlzdGVuZXInIDogJ2F0dGFjaEV2ZW50JztcbiAgICAgICAgICAgICAgICBjb25zdCBldmVudGVyID0gd2luZG93W2V2ZW50TWV0aG9kXTtcbiAgICAgICAgICAgICAgICBjb25zdCBtZXNzYWdlRXZlbnQgPSBldmVudE1ldGhvZCA9PSAnYXR0YWNoRXZlbnQnID8gJ29ubWVzc2FnZScgOiAnbWVzc2FnZSc7XG5cbiAgICAgICAgICAgICAgICAvLyBMaXN0ZW4gdG8gbWVzc2FnZSBmcm9tIGNoaWxkIHdpbmRvd1xuICAgICAgICAgICAgICAgIGV2ZW50ZXIobWVzc2FnZUV2ZW50LCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBsZXQgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQodGhpcy5ldmVudFR5cGVzW2UuZGF0YV0pO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmRpc3BhdGNoZXIuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgICAgICAgICAgICAgfSwgZmFsc2UpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgcHJlbG9hZGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cbiAgICAgICAgICAgICAgICBwcmVsb2FkZXIuaW5uZXJIVE1MID0gdGhpcy5jb25maWcucHJlbG9hZGVyO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgZWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsZW1lbnRJZCk7XG4gICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5zdHlsZS53aWR0aCA9IHdpZHRoO1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnN0eWxlLmhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hcHBlbmRDaGlsZChwcmVsb2FkZXIpO1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmFwcGVuZENoaWxkKHdpZGdldElmcmFtZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRWxlbWVudCBcXFwiJyArIGVsZW1lbnRJZCArICdcXFwiIG5vdCBmb3VuZCEnKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1BsZWFzZSBydW4gWEwuaW5pdCgpIGZpcnN0Jyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgb25DbG9zZUV2ZW50KCkge1xuICAgICAgICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdYc29sbGFMb2dpbldpZGdldElmcmFtZScpO1xuICAgICAgICBlbGVtZW50LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoZWxlbWVudCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogbGluayBldmVudCB3aXRoIGhhbmRsZXJcbiAgICAgKiBAcGFyYW0gZXZlbnRcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqL1xuXG4gICAgb24oZXZlbnQsIGhhbmRsZXIpIHtcbiAgICAgICAgaGFuZGxlciA9IGhhbmRsZXIgfHwgbnVsbDtcblxuICAgICAgICBpZiAoZXZlbnQgPT09IHRoaXMuZXZlbnRUeXBlcy5DTE9TRSkge1xuICAgICAgICAgICAgaWYgKCFoYW5kbGVyKSB7XG4gICAgICAgICAgICAgICAgaGFuZGxlciA9IHRoaXMub25DbG9zZUV2ZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kaXNwYXRjaGVyLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnQsIHRoaXMub25DbG9zZUV2ZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZGlzcGF0Y2hlci5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCBoYW5kbGVyKTtcbiAgICB9O1xufVxuXG5jb25zdCByZXN1bHQgPSBuZXcgWEwoKTtcblxubW9kdWxlLmV4cG9ydHMgPSByZXN1bHQ7Il19
