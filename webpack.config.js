const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      // Add any custom environment variables here
      mode: argv.mode || 'development',
    },
    argv
  );

  // Define environment variables for the browser
  const { DefinePlugin } = require('webpack');
  
  config.plugins.push(
    new DefinePlugin({
      'process.env.EXPO_PUBLIC_NEWS_API_KEY': JSON.stringify(process.env.EXPO_PUBLIC_NEWS_API_KEY),
      'process.env.EXPO_PUBLIC_GEMINI_API_KEY': JSON.stringify(process.env.EXPO_PUBLIC_GEMINI_API_KEY),
      'process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY': JSON.stringify(process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY),
    })
  );

  return config;
};