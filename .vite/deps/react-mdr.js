import {
  require_react
} from "./chunk-FXJVXTVJ.js";
import {
  __commonJS
} from "./chunk-4B2QHNJT.js";

// node_modules/react-mdr/dist/index.cjs.js
var require_index_cjs = __commonJS({
  "node_modules/react-mdr/dist/index.cjs.js"(exports, module) {
    "use strict";
    var e = require_react();
    function t(e2) {
      return e2 && "object" == typeof e2 && "default" in e2 ? e2 : { default: e2 };
    }
    var n = t(e);
    var r = [];
    var a = [];
    !function(e2, t2) {
      if (e2 && "undefined" != typeof document) {
        var n2, i2 = true === t2.prepend ? "prepend" : "append", o = true === t2.singleTag, l = "string" == typeof t2.container ? document.querySelector(t2.container) : document.getElementsByTagName("head")[0];
        if (o) {
          var c = r.indexOf(l);
          -1 === c && (c = r.push(l) - 1, a[c] = {}), n2 = a[c] && a[c][i2] ? a[c][i2] : a[c][i2] = u();
        } else n2 = u();
        65279 === e2.charCodeAt(0) && (e2 = e2.substring(1)), n2.styleSheet ? n2.styleSheet.cssText += e2 : n2.appendChild(document.createTextNode(e2));
      }
      function u() {
        var e3 = document.createElement("style");
        if (e3.setAttribute("type", "text/css"), t2.attributes) for (var n3 = Object.keys(t2.attributes), r2 = 0; r2 < n3.length; r2++) e3.setAttribute(n3[r2], t2.attributes[n3[r2]]);
        var a2 = "prepend" === i2 ? "afterbegin" : "beforeend";
        return l.insertAdjacentElement(a2, e3), e3;
      }
    }(".mrl-container {\n    background-color: rgba(0, 0, 0, 0.05);\n}\n", {});
    var i = { MatrixRainingLetters: function(t2) {
      var r2 = e.useRef(), a2 = "mrl-" + t2.key, i2 = "mrl-container " + t2.custom_class;
      return e.useEffect(function() {
        var e2 = function(e3, t3) {
          var n3 = e3.current, r3 = n3.getContext("2d");
          n3.width = window.innerWidth, n3.height = window.innerHeight;
          for (var a3 = "アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッンABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", i3 = n3.width / 16, o = [], l = 0; l < i3; l++) o[l] = 1;
          return function() {
            r3.fillStyle = "rgba(0, 0, 0, 0.05)", r3.fillRect(0, 0, n3.width, n3.height), r3.fillStyle = t3 || "#0F0", r3.font = "16px monospace";
            for (var e4 = 0; e4 < o.length; e4++) {
              var i4 = a3.charAt(Math.floor(Math.random() * a3.length));
              r3.fillText(i4, 16 * e4, 16 * o[e4]), 16 * o[e4] > n3.height && Math.random() > 0.975 && (o[e4] = 0), o[e4]++;
            }
          };
        }(r2, t2.color), n2 = setInterval(e2, 30);
        return function() {
          return clearInterval(n2);
        };
      }, [t2.color]), n.default.createElement(n.default.Fragment, null, n.default.createElement("canvas", { key: a2, className: i2, ref: r2 }));
    } };
    module.exports = i;
  }
});

// node_modules/react-mdr/index.js
var require_react_mdr = __commonJS({
  "node_modules/react-mdr/index.js"(exports, module) {
    module.exports = require_index_cjs();
  }
});
export default require_react_mdr();
//# sourceMappingURL=react-mdr.js.map
