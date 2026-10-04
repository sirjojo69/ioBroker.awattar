import eslintConfig from '@iobroker/eslint-config';

export default [
    ...eslintConfig,
    {
        rules: {
            // Adapter-specific rule overrides can go here
        },
    },
    {
        ignores: ['admin/build/', '.dev-server/', '*.test.js', 'lib/adapter-config.d.ts'],
    },
];
