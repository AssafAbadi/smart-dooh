const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

// Resolve workspace packages from monorepo libs (Metro doesn't use Babel aliases for resolution)
const sharedGeoPath = path.resolve(monorepoRoot, 'libs/shared/geo/src/index.ts');
const sharedDtoPath = path.resolve(monorepoRoot, 'libs/shared/dto/src/index.ts');
const sharedSdkPath = path.resolve(monorepoRoot, 'libs/shared/sdk/src/index.ts');

// Ensure @expo/metro-runtime subpaths (e.g. rsc/runtime) resolve from app node_modules
const metroRuntimePath = path.resolve(projectRoot, 'node_modules', '@expo', 'metro-runtime');
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@expo/metro-runtime/rsc/runtime') {
    return {
      filePath: path.join(metroRuntimePath, 'rsc', 'runtime.js'),
      type: 'sourceFile',
    };
  }
  if (moduleName === '@smart-dooh/shared-geo' || moduleName.startsWith('@smart-dooh/shared-geo/')) {
    const target = moduleName === '@smart-dooh/shared-geo'
      ? sharedGeoPath
      : path.resolve(monorepoRoot, 'libs/shared/geo/src', moduleName.replace('@smart-dooh/shared-geo/', ''));
    return { filePath: target, type: 'sourceFile' };
  }
  if (moduleName === '@smart-dooh/shared-dto' || moduleName.startsWith('@smart-dooh/shared-dto/')) {
    const target = moduleName === '@smart-dooh/shared-dto'
      ? sharedDtoPath
      : path.resolve(monorepoRoot, 'libs/shared/dto/src', moduleName.replace('@smart-dooh/shared-dto/', ''));
    return { filePath: target, type: 'sourceFile' };
  }
  if (moduleName === '@smart-dooh/shared-sdk' || moduleName.startsWith('@smart-dooh/shared-sdk/')) {
    const target = moduleName === '@smart-dooh/shared-sdk'
      ? sharedSdkPath
      : path.resolve(monorepoRoot, 'libs/shared/sdk/src', moduleName.replace('@smart-dooh/shared-sdk/', ''));
    return { filePath: target, type: 'sourceFile' };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
