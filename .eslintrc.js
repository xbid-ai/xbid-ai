module.exports = {
    env: {
        browser: true,
        commonjs: true,
        es2021: true
    },
    extends: 'standard',
    overrides: [
        {
            env: {
                node: true
            },
            files: [
                '.eslintrc.{js,cjs}'
            ],
            parserOptions: {
                sourceType: 'script'
            }
        }
    ],
    parserOptions: {
        ecmaVersion: 'latest'
    },
    rules: {
        quotes: ['error', 'single'],
        'no-unused-vars': 'error',
        indent: ['error', 4, { SwitchCase: 1, ignoredNodes: ['TemplateLiteral *'] }],
        semi: ['error', 'always'],
        'space-before-function-paren': ['error', 'never'],
        'operator-linebreak': ['error', 'before']
    },
    ignorePatterns: ['public/', '*.min.js']
};
