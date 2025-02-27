// Copyright (c) Consensys Software Inc. All rights reserved.
// Licensed under the MIT license.

import * as outputCommandHelper from "./command";
import * as commandContext from "./commandContext";
import {extractEnumsInfo, extractEnumsInfoSafe} from "./enumExtractor";
import * as gitHelper from "./git";
// import {required} from "./required";
import * as shell from "./shell";
import * as telemetryHelper from "./telemetry";
import {TruffleConfiguration} from "./truffleConfig";
import * as userSettings from "./userSettings";
import * as vscodeEnvironment from "./vscodeEnvironment";
import * as workspaceHelpers from "./workspace";

const spawnProcess = outputCommandHelper.spawnProcess;
const getWorkspaceRoot = workspaceHelpers.getWorkspaceRoot;
const getWorkspaces = workspaceHelpers.getWorkspaces;
const isWorkspaceOpen = workspaceHelpers.isWorkspaceOpen;
const TruffleConfig = TruffleConfiguration.TruffleConfig;
const CommandContext = commandContext.CommandContext;
const setCommandContext = commandContext.setCommandContext;

// for some reason this has stopped working once I bumped VSCode to 1.66
// export * from "./userInteraction";

export {
  CommandContext,
  extractEnumsInfo,
  extractEnumsInfoSafe,
  getWorkspaceRoot,
  getWorkspaces,
  gitHelper,
  isWorkspaceOpen,
  outputCommandHelper,
  //required,
  setCommandContext,
  shell,
  spawnProcess,
  telemetryHelper,
  TruffleConfig,
  TruffleConfiguration,
  userSettings,
  vscodeEnvironment,
};
