/* @naejip/core — 규제 룰셋 + 계산 엔진 + 표시 포맷
 * 웹(script 태그)과 앱(React Native)이 같은 소스를 쓴다. */

module.exports = Object.assign(
  {},
  require("./rulesets.js"),
  require("./calc.js"),
  require("./format.js")
);
