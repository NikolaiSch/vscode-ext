// Copyright (c) Consensys Software Inc. All rights reserved.
// Licensed under the MIT license.

// process.env.DEBUG = "debugger:session";
// @ts-ignore
process.browser = true;
// @ts-ignore
global.window = {process: {type: "renderer"}};

import truffleDebugger from "@truffle/debugger";
import {EventEmitter} from "events";
import {filterContractsWithAddress, prepareContracts} from "./contracts/contractsPrepareHelpers";
import {TranslatedResult, translateTruffleVariables} from "./helpers";
import {DebuggerTypes} from "./models/debuggerTypes";
import {ICallInfo} from "./models/ICallInfo";
import {IContractModel} from "./models/IContractModel";
import {IInstruction} from "./models/IInstruction";

export default class RuntimeInterface extends EventEmitter {
  private _isDebuggerAttached: boolean;
  private _session: truffleDebugger.Session | undefined;
  private _selectors: truffleDebugger.Selectors;
  private _numBreakpoints: number;
  private _deployedContracts: IContractModel[];
  private _initialBreakPoints: Array<{path: string; lines: number[]}>;
  private _fileLookupMap: Map<string, string>;

  constructor() {
    super();

    this._selectors = truffleDebugger.selectors;
    this._numBreakpoints = 0;
    this._isDebuggerAttached = false;
    this._initialBreakPoints = [];
    this._deployedContracts = [];
    this._fileLookupMap = new Map();
  }

  public clearBreakpoints(): Promise<void> {
    return this._session ? this._session.removeAllBreakpoints() : Promise.resolve();
  }

  public storeInitialBreakPoints(path: string, lines: number[]) {
    this._initialBreakPoints.push({path, lines});
  }

  public async processInitialBreakPoints() {
    if (this._initialBreakPoints.length === 0) {
      return;
    }

    for (const initialBreakPoint of this._initialBreakPoints) {
      const {path, lines} = initialBreakPoint;
      for (const line of lines) {
        await this.setBreakpoint(path, line);
      }
    }
    this._initialBreakPoints.length = 0; // remove them since they are no longer needed
  }

  public async setBreakpoint(_filePath: string, line: number): Promise<DebuggerTypes.IBreakpoint | null> {
    if (!this._session) {
      return Promise.resolve(null);
    }

    // we'll need the debugger-internal ID of this source
    const debuggerSource: any = this._session.view(this._selectors.sourcemapping.current.source);

    const breakpoint: DebuggerTypes.IBreakpoint = {
      id: this._numBreakpoints,
      line,
      sourceId: debuggerSource.id,
    };

    this._numBreakpoints++;
    // TODO: we might need to make this addBreakpoint lazy on session init.
    this._session.addBreakpoint(breakpoint);
    return breakpoint;
  }

  // Get stack trace (without method name)
  public callStack(): ICallInfo[] {
    this.validateSession();
    const callStack = this._session!.view(this._selectors.evm.current.callstack);
    const currentLine = this.currentLine();
    if (callStack.length === 1) {
      return [{...currentLine, method: "Current"}];
    }

    const result: ICallInfo[] = [];
    // There is no api to get line/collumn of previous call
    // That's why set them as default
    const defaultLine = {line: 0, column: 0};
    for (let i = 0; i < callStack.length - 1; i++) {
      // processing all previous calls
      const contract = this._deployedContracts.find(
        (c: any) => c.address === (callStack[i].address || callStack[i].storageAddress)
      );
      if (contract === undefined) {
        throw new Error(`Coundn\'t find contract by address ${callStack[i].address || callStack[i].storageAddress}`);
      }
      result.push({file: contract.sourcePath, ...defaultLine, method: "Previous"});
    }

    result.push({...currentLine, method: "Current"});
    return result;
  }

  /**
   *
   * @returns the object of all the variables. keyed on variable name.
   */
  public async variables(/* args?: DebugProtocol.VariablesArguments */): Promise<
    Record<string, TranslatedResult> | any
  > {
    if (this._session) {
      const variables = await this._session.variables({indicateUnknown: true});
      return translateTruffleVariables(variables);
    } else {
      return Promise.resolve({});
    }
  }

  public async continue(): Promise<void> {
    this.validateSession();
    await this._session!.continueUntilBreakpoint();
    this.processStepping("stopOnBreakpoint");
  }

  public continueReverse(): void {
    this.validateSession();
    this.sendEvent("stopOnBreakpoint");
  }

  public async stepNext(): Promise<void> {
    this.validateSession();
    await this._session!.stepNext();
    this.processStepping("stopOnStepOver");
  }

  public async stepIn(): Promise<void> {
    this.validateSession();
    await this._session!.stepInto();
    this.processStepping("stopOnStepIn");
  }

  public async stepOut(): Promise<void> {
    this.validateSession();
    await this._session!.stepOut();
    this.processStepping("stopOnStepOut");
  }
  /**
   * FIXME: rework this
   * @param txHash
   * @param workingDirectory
   */
  public async attach(txHash: string, workingDirectory: string): Promise<void> {
    const result = await prepareContracts(workingDirectory);

    this._deployedContracts = filterContractsWithAddress(result.contracts);

    const options: truffleDebugger.DebuggerOptions = {
      contracts: result.contracts,
      files: result.files,
      provider: result.provider,
    };
    this._fileLookupMap = result.lookupMap;
    this._session = await this.generateSession(txHash, options);
    this._isDebuggerAttached = true;
  }

  public currentLine(): DebuggerTypes.IFrame {
    this.validateSession();
    const currentLocation = this._session!.view(this._selectors.controller.current.location);
    const sourcePath = this._session!.view(this._selectors.sourcemapping.current.source).sourcePath;
    if (!sourcePath) {
      throw new Error("No source file");
    }
    // so if we have a file in a location that doesn't map 1:1 to the actual file name in the compiler we map it here...
    const file = this._fileLookupMap.has(sourcePath) ? this._fileLookupMap.get(sourcePath) : sourcePath;

    return {
      column: currentLocation.sourceRange ? currentLocation.sourceRange.lines.start.column : 0,
      file,
      line: currentLocation.sourceRange ? currentLocation.sourceRange.lines.start.line : 0,
    };
  }

  public getInstructionSteps(): IInstruction[] {
    this.validateSession();
    const steps: IInstruction[] = this._session!.view(this._selectors.trace.steps);
    return steps;
  }

  public getCurrentInstructionStep(): IInstruction {
    this.validateSession();
    return this._session!.view(this._selectors.sourcemapping.current.instruction) as IInstruction;
  }

  public sendEvent(event: string, ...args: any[]) {
    setImmediate(() => {
      this.emit(event, ...args);
    });
  }

  public isDebuggerAttached() {
    return this._isDebuggerAttached;
  }

  private processStepping(event: any) {
    const isEndOfTransactionTrace = this._session!.view(this._selectors.trace.finished);
    if (isEndOfTransactionTrace) {
      this.sendEvent("end");
    } else {
      this.sendEvent(event);
    }
  }

  private async generateSession(txHash: string, options: truffleDebugger.DebuggerOptions) {
    const bugger = await truffleDebugger.forTx(txHash, options);
    return bugger.connect();
  }

  private validateSession() {
    if (!this._session) {
      throw new Error("Debug session is undefined");
    }
  }
}
