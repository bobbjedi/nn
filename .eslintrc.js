module.exports = {
  'root': true,
  // "extends": [
  //     "plugin:vue/vue3-essential",
  //     "@vue/typescript",
  //     "eslint:recommended"
  // ],
  // "parserOptions": {
  //     "parser": "@typescript-eslint/parser"
  // },

  'parser': '@typescript-eslint/parser',
  // 'parser': 'vue-eslint-parser',
  'plugins': [
    '@typescript-eslint'
  ],
  'extends': [
    'eslint:recommended',
    // 'plugin:vue/vue3-recommended',
    // 'plugin:@typescript-eslint/eslint-recommended',
    // 'plugin:@typescript-eslint/recommended'
  ],

  'rules': {
    'space-before-function-paren': ['error', 'always'], // отсупы вокруг и внутри функций и методов
    'no-trailing-spaces': 'error',
    'spaced-comment': ['error', 'always'],
    'no-multiple-empty-lines': ['error', { 'max': 1, 'maxEOF': 0 }],
    'no-unused-vars': 'warn',
    'arrow-spacing': ['error', { 'before': true, 'after': true }], // отступы () => {}
    'object-curly-spacing': ['error', 'always'], // отступ в обьектах { x: 1 }
    'quotes': ['error', 'single'], // одиночные кавычки
    'semi': ['warn', 'never'], // обязательно отсутствие ;
    'semi-spacing': ['error', { 'before': false, 'after': true }],
    'indent': ['error', 2],
    'space-infix-ops': 'error', // отступы вокруг + - * / = и тд
    'eqeqeq': 'error', // обязательно === и !== (нельзя == и !=)
    'no-eq-null': 'error', // обязательно === и !== (нельзя == и !=) но тоько в отношении null
    'curly': 'error', // проверка шаблонов `${name}`
    'key-spacing': ['error', { 'mode': 'strict' }], // оформление обЪекта
    'eol-last': ['error', 'never'],
    'space-in-parens': ['error', 'never'], // запрет отступов ( a,b)
    'computed-property-spacing': ['error', 'never'], // запрет лишних отступов в выражениях a[ i]
    'array-bracket-spacing': ['error', 'never'],
    'no-multi-spaces': 'error', // запрет лишних пробелов var a   = 2
    'no-sparse-arrays': 'warn', // предупреждение при дырке в массиве
    'no-mixed-spaces-and-tabs': 'error', // нельзя миксовать табы и пробелы
    // "@typescript-eslint/indent": ["error"]
    'keyword-spacing': ['error', { 'after': true, 'before': true }],
    'space-before-blocks': 'error',
    'block-spacing': 'error',
    'comma-spacing': ['error', { 'before': false, 'after': true }], // отступ после запятой, а перед нельзя
    'no-undef': 'error',
    'array-callback-return': 'error', // коллбек методов массива типа arr.map arr.filter должны иметь return в коллбеке
  },
  'env': {
    'browser': true,
    'node': true
  },
  'globals': {
    $: true,
    'globalThis': false, // means it is not writeable
  }
}

// "root": true,
// "env": {
//   "node": true
// },
// "extends": [
//   "plugin:vue/vue3-essential",
//   "@vue/typescript"
// ],
// "parserOptions": {
//   "parser": "@typescript-eslint/parser"
// },
// "rules": {
//   "quotes": [
//     "error",
//     "single"
//   ],
//   "semi": "warn",
//   "semi-spacing": [
//     "error",
//     {
//       "before": false,
//       "after": true
//     }
//   ],
//   "indent": [
//     "error",
//     2
//   ],
//   "space-infix-ops": "error",
//   "eqeqeq": "error",
//   "no-eq-null": "error",
//   "curly": "error",
//   "space-before-function-paren": [
//     "error",
//     {
//       "anonymous": "always",
//       "named": "always",
//       "asyncArrow": "ignore"
//     }
//   ],
//   "key-spacing": [
//     "error",
//     {
//       "mode": "strict"
//     }
//   ],
//   "space-in-parens": [
//     "error",
//     "never"
//   ],
//   "computed-property-spacing": [
//     "error",
//     "never"
//   ],
//   "array-bracket-spacing": [
//     "error",
//     "never"
//   ],
//   "no-multi-spaces": "error",
//   "no-sparse-arrays": "warn",
//   "no-mixed-spaces-and-tabs": "error",
//   "keyword-spacing": [
//     "error",
//     {
//       "after": true
//     }
//   ],
//   "comma-spacing": [
//     "error",
//     {
//       "before": false,
//       "after": true
//     }
//   ],
//   "no-undef": "error",
//   "array-callback-return": "error",
//   "function-call-argument-newline": 0
// }