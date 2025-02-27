// Copyright (c) Consensys Software Inc. All rights reserved.
// Licensed under the MIT license.

declare module "@truffle/debugger" {
  // Fixme: bumping TS might make all this work...
  // import type {ContractObject} from "@truffle/contract-schema/spec";
  // import type Common from "@truffle/compile-common";
  // import {Compilations} from "@truffle/codec";
  import {provider as Web3Provider} from "web3-core";
  // import type Web3 from "web3";
  interface Selectors {
    // FIXME: there are more selectors in the latest release we can add in here?
    sourcemapping: any;
    evm: any;
    controller: any;
    trace: any;
  }
  const selectors: Selectors;

  interface Session {
    removeAllBreakpoints: () => Promise<void>;
    view: (selectors: any) => any;
    addBreakpoint: (breakPoint: any) => {};
    variables: ({indicateUnknown: boolean}?) => Promise<any>;
    continueUntilBreakpoint: () => Promise<void>;
    stepNext: () => Promise<void>;
    stepInto: () => Promise<void>;
    stepOut: () => Promise<void>;
  }

  interface Debugger {
    connect: () => Session;
  }

  // type Artifact = ContractObject | Common.CompiledContract;
  // export type DebuggerOptions = {
  //   contracts?: Array<Artifact>;
  //   files?: Array<string>;
  //   provider: Web3Provider;
  //   compilations?: Array<Compilations.Compilation>;
  //   lightMode?: boolean;
  // };

  /**
   * More permissively typed Object
   */
  type DebuggerOptions = {
    contracts?: Array<any>;
    files?: Array<string>;
    provider: Web3Provider;
    compilations?: Array<any>;
    lightMode?: boolean;
  };

  /**
   * Instantiates a Debugger for a given transaction hash.
   * Throws on failure.  If you want a more failure-tolerant method,
   * use forProject and then do a session.load inside a try.
   *
   * @param {String} txHash - transaction hash with leading "0x"
   * @param {{contracts: Array<Artifact>, files: Array<String>, provider: Web3Provider, compilations: Array<Compilation>}} options -
   * @return {Debugger} instance
   */
  function forTx(txHash: string, options: DebuggerOptions): Promise<Debugger>;

  export {selectors, Selectors, forTx, Session, DebuggerOptions};
}
