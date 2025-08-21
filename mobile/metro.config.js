// Enable importing files from the sibling `shared/` folder in this monorepo
const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');
const sharedDir = path.resolve(workspaceRoot, 'shared');

/** @type {import('metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// 1) Watch only `shared/` so changes trigger rebuilds without exposing the entire monorepo
config.watchFolders = [sharedDir];

// 2) Resolve modules from the app and the workspace root node_modules
config.resolver = {
	...config.resolver,
	nodeModulesPaths: [
		path.resolve(projectRoot, 'node_modules'),
		path.resolve(workspaceRoot, 'node_modules'),
	],
	// Avoid walking up beyond these paths to prevent duplicate/react-native
	disableHierarchicalLookup: true,
};

module.exports = config;


