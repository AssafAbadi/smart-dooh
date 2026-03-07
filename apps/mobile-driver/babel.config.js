module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'react' }],
    ],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@smart-dooh/shared-dto': '../../libs/shared/dto/src/index.ts',
            '@smart-dooh/shared-dto/*': '../../libs/shared/dto/src/*',
            '@smart-dooh/shared-sdk': '../../libs/shared/sdk/src/index.ts',
            '@smart-dooh/shared-sdk/*': '../../libs/shared/sdk/src/*',
          },
        },
      ],
    ],
  };
};
