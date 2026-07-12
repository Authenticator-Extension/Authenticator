// Vendored replacement for the abandoned `vue-svg-loader` (last published
// 2020-09-13, Vue 3 support never left beta). Wraps an SVG file's source as
// a Vue single-file-component <template>, which vue-loader then compiles —
// same mechanism the old loader used, so all existing `import Icon from
// "./x.svg"` call sites and the `declare module "*.svg"` type shim in
// src/definitions/shims-vue.d.ts keep working unchanged.
//
// Vendored (with one Windows fix, see below) instead of depending on the npm
// package because the upstream package (@ifcanduela/vue-svg-loader@0.0.1) is
// itself a single unmaintained release with zero downstream dependents to
// vet — vendoring keeps the supply-chain surface at zero added packages
// while preserving the same behavior.
//
// Source: https://github.com/ifcanduela/vue-svg-loader (index.js @ master,
// commit as of 2022-10-11), MIT License, Copyright (c) 2022 Igor F. Canduela.
//
// One deviation from upstream: `resourcePath.split("/").pop()` only strips
// POSIX separators, so on Windows the full absolute path (with backslashes)
// leaked into the generated component `name` string, and backslash
// sequences like "\x" broke the SFC's <script> block as invalid escapes.
// Split on both "/" and "\\" so this works on Windows too.
//
// MIT License
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

// This is a Node/CommonJS webpack loader (same category as webpack.config.js,
// which the eslint config ignores outright); `module` is a Node global, not
// an undeclared variable.
// eslint-disable-next-line no-undef
module.exports = function (src) {
  const name = `InlineSvg:${this.resourcePath.split(/[/\\]/).pop()}`;

  return `
        <template>
            ${src}
        </template>

        <script>
            export default {
                name: "${name}"
            }
        </script>
    `;
};
