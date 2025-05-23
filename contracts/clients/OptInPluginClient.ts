/* eslint-disable */
/**
 * This file was automatically generated by @algorandfoundation/algokit-client-generator.
 * DO NOT MODIFY IT BY HAND.
 * requires: @algorandfoundation/algokit-utils: ^7
 */
import { AlgorandClientInterface } from '@algorandfoundation/algokit-utils/types/algorand-client-interface'
import { ABIReturn, AppReturn, SendAppTransactionResult } from '@algorandfoundation/algokit-utils/types/app'
import { Arc56Contract, getArc56ReturnValue, getABIStructFromABITuple } from '@algorandfoundation/algokit-utils/types/app-arc56'
import {
  AppClient as _AppClient,
  AppClientMethodCallParams,
  AppClientParams,
  AppClientBareCallParams,
  CallOnComplete,
  AppClientCompilationParams,
  ResolveAppClientByCreatorAndName,
  ResolveAppClientByNetwork,
  CloneAppClientParams,
} from '@algorandfoundation/algokit-utils/types/app-client'
import { AppFactory as _AppFactory, AppFactoryAppClientParams, AppFactoryResolveAppClientByCreatorAndNameParams, AppFactoryDeployParams, AppFactoryParams, CreateSchema } from '@algorandfoundation/algokit-utils/types/app-factory'
import { TransactionComposer, AppCallMethodCall, AppMethodCallTransactionArgument, SimulateOptions, RawSimulateOptions, SkipSignaturesSimulateOptions } from '@algorandfoundation/algokit-utils/types/composer'
import { SendParams, SendSingleTransactionResult, SendAtomicTransactionComposerResults } from '@algorandfoundation/algokit-utils/types/transaction'
import { Address, encodeAddress, modelsv2, OnApplicationComplete, Transaction, TransactionSigner } from 'algosdk'
import SimulateResponse = modelsv2.SimulateResponse

export const APP_SPEC: Arc56Contract = {"name":"OptInPlugin","structs":{},"methods":[{"name":"createApplication","args":[],"returns":{"type":"void"},"actions":{"create":["NoOp"],"call":[]},"readonly":false,"events":[],"recommendations":{}},{"name":"optInToAsset","args":[{"type":"uint64","name":"sender"},{"type":"uint64","name":"asset"},{"type":"pay","name":"mbrPayment"}],"returns":{"type":"void"},"actions":{"create":[],"call":["NoOp"]},"readonly":false,"events":[],"recommendations":{}}],"arcs":[22,28],"networks":{},"state":{"schema":{"global":{"ints":0,"bytes":0},"local":{"ints":0,"bytes":0}},"keys":{"global":{},"local":{},"box":{}},"maps":{"global":{},"local":{},"box":{}}},"bareActions":{"create":[],"call":[]},"sourceInfo":{"approval":{"sourceInfo":[{"pc":[36,64],"errorMessage":"OnCompletion is not NoOp"},{"pc":[99],"errorMessage":"application exists"},{"pc":[91],"errorMessage":"asset mismatch"},{"pc":[68],"errorMessage":"can only call when creating"},{"pc":[39],"errorMessage":"can only call when not creating"},{"pc":[55],"errorMessage":"transaction type is pay"}],"pcOffsetMethod":"none"},"clear":{"sourceInfo":[],"pcOffsetMethod":"none"}},"source":{"approval":"I3ByYWdtYSB2ZXJzaW9uIDEwCiNwcmFnbWEgdHlwZXRyYWNrIGZhbHNlCgovLyBAYWxnb3JhbmRmb3VuZGF0aW9uL2FsZ29yYW5kLXR5cGVzY3JpcHQvYXJjNC9pbmRleC5kLnRzOjpDb250cmFjdC5hcHByb3ZhbFByb2dyYW0oKSAtPiB1aW50NjQ6Cm1haW46CiAgICBpbnRjYmxvY2sgMSAwCiAgICAvLyBjb250cmFjdHMvcGx1Z2lucy9vcHRpbl9wbHVnaW4uYWxnby50czozCiAgICAvLyBleHBvcnQgY2xhc3MgT3B0SW5QbHVnaW4gZXh0ZW5kcyBDb250cmFjdCB7CiAgICB0eG4gTnVtQXBwQXJncwogICAgYnogbWFpbl9hZnRlcl9pZl9lbHNlQDgKICAgIHB1c2hieXRlc3MgMHhiODQ0N2IzNiAweGUxMThkN2FmIC8vIG1ldGhvZCAiY3JlYXRlQXBwbGljYXRpb24oKXZvaWQiLCBtZXRob2QgIm9wdEluVG9Bc3NldCh1aW50NjQsdWludDY0LHBheSl2b2lkIgogICAgdHhuYSBBcHBsaWNhdGlvbkFyZ3MgMAogICAgbWF0Y2ggbWFpbl9jcmVhdGVBcHBsaWNhdGlvbl9yb3V0ZUAzIG1haW5fb3B0SW5Ub0Fzc2V0X3JvdXRlQDQKCm1haW5fYWZ0ZXJfaWZfZWxzZUA4OgogICAgLy8gY29udHJhY3RzL3BsdWdpbnMvb3B0aW5fcGx1Z2luLmFsZ28udHM6MwogICAgLy8gZXhwb3J0IGNsYXNzIE9wdEluUGx1Z2luIGV4dGVuZHMgQ29udHJhY3QgewogICAgaW50Y18xIC8vIDAKICAgIHJldHVybgoKbWFpbl9vcHRJblRvQXNzZXRfcm91dGVANDoKICAgIC8vIGNvbnRyYWN0cy9wbHVnaW5zL29wdGluX3BsdWdpbi5hbGdvLnRzOjgKICAgIC8vIG9wdEluVG9Bc3NldChzZW5kZXI6IGFyYzQuVWludE42NCwgYXNzZXQ6IGFyYzQuVWludE42NCwgbWJyUGF5bWVudDogZ3R4bi5QYXltZW50VHhuKTogdm9pZCB7CiAgICB0eG4gT25Db21wbGV0aW9uCiAgICAhCiAgICBhc3NlcnQgLy8gT25Db21wbGV0aW9uIGlzIG5vdCBOb09wCiAgICB0eG4gQXBwbGljYXRpb25JRAogICAgYXNzZXJ0IC8vIGNhbiBvbmx5IGNhbGwgd2hlbiBub3QgY3JlYXRpbmcKICAgIC8vIGNvbnRyYWN0cy9wbHVnaW5zL29wdGluX3BsdWdpbi5hbGdvLnRzOjMKICAgIC8vIGV4cG9ydCBjbGFzcyBPcHRJblBsdWdpbiBleHRlbmRzIENvbnRyYWN0IHsKICAgIHR4bmEgQXBwbGljYXRpb25BcmdzIDEKICAgIHR4bmEgQXBwbGljYXRpb25BcmdzIDIKICAgIHR4biBHcm91cEluZGV4CiAgICBpbnRjXzAgLy8gMQogICAgLQogICAgZHVwCiAgICBndHhucyBUeXBlRW51bQogICAgaW50Y18wIC8vIHBheQogICAgPT0KICAgIGFzc2VydCAvLyB0cmFuc2FjdGlvbiB0eXBlIGlzIHBheQogICAgLy8gY29udHJhY3RzL3BsdWdpbnMvb3B0aW5fcGx1Z2luLmFsZ28udHM6OAogICAgLy8gb3B0SW5Ub0Fzc2V0KHNlbmRlcjogYXJjNC5VaW50TjY0LCBhc3NldDogYXJjNC5VaW50TjY0LCBtYnJQYXltZW50OiBndHhuLlBheW1lbnRUeG4pOiB2b2lkIHsKICAgIGNhbGxzdWIgb3B0SW5Ub0Fzc2V0CiAgICBpbnRjXzAgLy8gMQogICAgcmV0dXJuCgptYWluX2NyZWF0ZUFwcGxpY2F0aW9uX3JvdXRlQDM6CiAgICAvLyBjb250cmFjdHMvcGx1Z2lucy9vcHRpbl9wbHVnaW4uYWxnby50czo1CiAgICAvLyBAYWJpbWV0aG9kKHsgb25DcmVhdGU6ICdyZXF1aXJlJyB9KQogICAgdHhuIE9uQ29tcGxldGlvbgogICAgIQogICAgYXNzZXJ0IC8vIE9uQ29tcGxldGlvbiBpcyBub3QgTm9PcAogICAgdHhuIEFwcGxpY2F0aW9uSUQKICAgICEKICAgIGFzc2VydCAvLyBjYW4gb25seSBjYWxsIHdoZW4gY3JlYXRpbmcKICAgIGludGNfMCAvLyAxCiAgICByZXR1cm4KCgovLyBjb250cmFjdHMvcGx1Z2lucy9vcHRpbl9wbHVnaW4uYWxnby50czo6T3B0SW5QbHVnaW4ub3B0SW5Ub0Fzc2V0KHNlbmRlcjogYnl0ZXMsIGFzc2V0OiBieXRlcywgbWJyUGF5bWVudDogdWludDY0KSAtPiB2b2lkOgpvcHRJblRvQXNzZXQ6CiAgICAvLyBjb250cmFjdHMvcGx1Z2lucy9vcHRpbl9wbHVnaW4uYWxnby50czo4CiAgICAvLyBvcHRJblRvQXNzZXQoc2VuZGVyOiBhcmM0LlVpbnRONjQsIGFzc2V0OiBhcmM0LlVpbnRONjQsIG1iclBheW1lbnQ6IGd0eG4uUGF5bWVudFR4bik6IHZvaWQgewogICAgcHJvdG8gMyAwCiAgICAvLyBjb250cmFjdHMvcGx1Z2lucy9vcHRpbl9wbHVnaW4uYWxnby50czo5CiAgICAvLyBjb25zdCBbY29udHJvbGxlZEFjY291bnRCeXRlc10gPSBvcC5BcHBHbG9iYWwuZ2V0RXhCeXRlcyhBcHBsaWNhdGlvbihzZW5kZXIubmF0aXZlKSwgQnl0ZXMoJ2MnKSk7CiAgICBmcmFtZV9kaWcgLTMKICAgIGJ0b2kKICAgIGR1cAogICAgcHVzaGJ5dGVzICJjIgogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIHBvcAogICAgc3dhcAogICAgLy8gY29udHJhY3RzL3BsdWdpbnMvb3B0aW5fcGx1Z2luLmFsZ28udHM6MTcKICAgIC8vIGFzc2VydChtYnJQYXltZW50LmFtb3VudCA+PSBHbG9iYWwuYXNzZXRPcHRJbk1pbkJhbGFuY2UsICdhc3NldCBtaXNtYXRjaCcpOwogICAgZnJhbWVfZGlnIC0xCiAgICBndHhucyBBbW91bnQKICAgIGdsb2JhbCBBc3NldE9wdEluTWluQmFsYW5jZQogICAgPj0KICAgIGFzc2VydCAvLyBhc3NldCBtaXNtYXRjaAogICAgLy8gY29udHJhY3RzL3BsdWdpbnMvb3B0aW5fcGx1Z2luLmFsZ28udHM6MTktMjgKICAgIC8vIGl0eG4KICAgIC8vICAgLmFzc2V0VHJhbnNmZXIoewogICAgLy8gICAgIHNlbmRlcjogY29udHJvbGxlZEFjY291bnQsCiAgICAvLyAgICAgYXNzZXRSZWNlaXZlcjogY29udHJvbGxlZEFjY291bnQsCiAgICAvLyAgICAgYXNzZXRBbW91bnQ6IDAsCiAgICAvLyAgICAgeGZlckFzc2V0OiBBc3NldChhc3NldC5uYXRpdmUpLAogICAgLy8gICAgIHJla2V5VG86IEFwcGxpY2F0aW9uKHNlbmRlci5uYXRpdmUpLmFkZHJlc3MsCiAgICAvLyAgICAgZmVlOiAwLAogICAgLy8gICB9KQogICAgLy8gICAuc3VibWl0KCk7CiAgICBpdHhuX2JlZ2luCiAgICAvLyBjb250cmFjdHMvcGx1Z2lucy9vcHRpbl9wbHVnaW4uYWxnby50czoyNAogICAgLy8geGZlckFzc2V0OiBBc3NldChhc3NldC5uYXRpdmUpLAogICAgZnJhbWVfZGlnIC0yCiAgICBidG9pCiAgICAvLyBjb250cmFjdHMvcGx1Z2lucy9vcHRpbl9wbHVnaW4uYWxnby50czoyNQogICAgLy8gcmVrZXlUbzogQXBwbGljYXRpb24oc2VuZGVyLm5hdGl2ZSkuYWRkcmVzcywKICAgIHN3YXAKICAgIGFwcF9wYXJhbXNfZ2V0IEFwcEFkZHJlc3MKICAgIGFzc2VydCAvLyBhcHBsaWNhdGlvbiBleGlzdHMKICAgIGl0eG5fZmllbGQgUmVrZXlUbwogICAgaXR4bl9maWVsZCBYZmVyQXNzZXQKICAgIC8vIGNvbnRyYWN0cy9wbHVnaW5zL29wdGluX3BsdWdpbi5hbGdvLnRzOjIzCiAgICAvLyBhc3NldEFtb3VudDogMCwKICAgIGludGNfMSAvLyAwCiAgICBpdHhuX2ZpZWxkIEFzc2V0QW1vdW50CiAgICBkdXAKICAgIGl0eG5fZmllbGQgQXNzZXRSZWNlaXZlcgogICAgaXR4bl9maWVsZCBTZW5kZXIKICAgIC8vIGNvbnRyYWN0cy9wbHVnaW5zL29wdGluX3BsdWdpbi5hbGdvLnRzOjE5LTI3CiAgICAvLyBpdHhuCiAgICAvLyAgIC5hc3NldFRyYW5zZmVyKHsKICAgIC8vICAgICBzZW5kZXI6IGNvbnRyb2xsZWRBY2NvdW50LAogICAgLy8gICAgIGFzc2V0UmVjZWl2ZXI6IGNvbnRyb2xsZWRBY2NvdW50LAogICAgLy8gICAgIGFzc2V0QW1vdW50OiAwLAogICAgLy8gICAgIHhmZXJBc3NldDogQXNzZXQoYXNzZXQubmF0aXZlKSwKICAgIC8vICAgICByZWtleVRvOiBBcHBsaWNhdGlvbihzZW5kZXIubmF0aXZlKS5hZGRyZXNzLAogICAgLy8gICAgIGZlZTogMCwKICAgIC8vICAgfSkKICAgIHB1c2hpbnQgNCAvLyA0CiAgICBpdHhuX2ZpZWxkIFR5cGVFbnVtCiAgICAvLyBjb250cmFjdHMvcGx1Z2lucy9vcHRpbl9wbHVnaW4uYWxnby50czoyNgogICAgLy8gZmVlOiAwLAogICAgaW50Y18xIC8vIDAKICAgIGl0eG5fZmllbGQgRmVlCiAgICAvLyBjb250cmFjdHMvcGx1Z2lucy9vcHRpbl9wbHVnaW4uYWxnby50czoxOS0yOAogICAgLy8gaXR4bgogICAgLy8gICAuYXNzZXRUcmFuc2Zlcih7CiAgICAvLyAgICAgc2VuZGVyOiBjb250cm9sbGVkQWNjb3VudCwKICAgIC8vICAgICBhc3NldFJlY2VpdmVyOiBjb250cm9sbGVkQWNjb3VudCwKICAgIC8vICAgICBhc3NldEFtb3VudDogMCwKICAgIC8vICAgICB4ZmVyQXNzZXQ6IEFzc2V0KGFzc2V0Lm5hdGl2ZSksCiAgICAvLyAgICAgcmVrZXlUbzogQXBwbGljYXRpb24oc2VuZGVyLm5hdGl2ZSkuYWRkcmVzcywKICAgIC8vICAgICBmZWU6IDAsCiAgICAvLyAgIH0pCiAgICAvLyAgIC5zdWJtaXQoKTsKICAgIGl0eG5fc3VibWl0CiAgICByZXRzdWIK","clear":"I3ByYWdtYSB2ZXJzaW9uIDEwCiNwcmFnbWEgdHlwZXRyYWNrIGZhbHNlCgovLyBAYWxnb3JhbmRmb3VuZGF0aW9uL2FsZ29yYW5kLXR5cGVzY3JpcHQvYmFzZS1jb250cmFjdC5kLnRzOjpCYXNlQ29udHJhY3QuY2xlYXJTdGF0ZVByb2dyYW0oKSAtPiB1aW50NjQ6Cm1haW46CiAgICBwdXNoaW50IDEgLy8gMQogICAgcmV0dXJuCg=="},"byteCode":{"approval":"CiACAQAxG0EAFYICBLhEezYE4RjXrzYaAI4CAB4AAiNDMRkURDEYRDYaATYaAjEWIglJOBAiEkSIAAwiQzEZFEQxGBREIkOKAwCL/RdJgAFjZUhMi/84CDIQD0Sxi/4XTHIIRLIgshEjshJJshSyAIEEshAjsgGziQ==","clear":"CoEBQw=="},"compilerInfo":{"compiler":"puya","compilerVersion":{"major":4,"minor":4,"patch":4}},"events":[],"templateVariables":{}} as unknown as Arc56Contract

/**
 * A state record containing binary data
 */
export interface BinaryState {
  /**
   * Gets the state value as a Uint8Array
   */
  asByteArray(): Uint8Array | undefined
  /**
   * Gets the state value as a string
   */
  asString(): string | undefined
}

class BinaryStateValue implements BinaryState {
  constructor(private value: Uint8Array | undefined) {}

  asByteArray(): Uint8Array | undefined {
    return this.value
  }

  asString(): string | undefined {
    return this.value !== undefined ? Buffer.from(this.value).toString('utf-8') : undefined
  }
}

/**
 * Expands types for IntelliSense so they are more human readable
 * See https://stackoverflow.com/a/69288824
 */
export type Expand<T> = T extends (...args: infer A) => infer R
  ? (...args: Expand<A>) => Expand<R>
  : T extends infer O
    ? { [K in keyof O]: O[K] }
    : never


/**
 * The argument types for the OptInPlugin contract
 */
export type OptInPluginArgs = {
  /**
   * The object representation of the arguments for each method
   */
  obj: {
    'createApplication()void': Record<string, never>
    'optInToAsset(uint64,uint64,pay)void': {
      sender: bigint | number
      asset: bigint | number
      mbrPayment: AppMethodCallTransactionArgument
    }
  }
  /**
   * The tuple representation of the arguments for each method
   */
  tuple: {
    'createApplication()void': []
    'optInToAsset(uint64,uint64,pay)void': [sender: bigint | number, asset: bigint | number, mbrPayment: AppMethodCallTransactionArgument]
  }
}

/**
 * The return type for each method
 */
export type OptInPluginReturns = {
  'createApplication()void': void
  'optInToAsset(uint64,uint64,pay)void': void
}

/**
 * Defines the types of available calls and state of the OptInPlugin smart contract.
 */
export type OptInPluginTypes = {
  /**
   * Maps method signatures / names to their argument and return types.
   */
  methods:
    & Record<'createApplication()void' | 'createApplication', {
      argsObj: OptInPluginArgs['obj']['createApplication()void']
      argsTuple: OptInPluginArgs['tuple']['createApplication()void']
      returns: OptInPluginReturns['createApplication()void']
    }>
    & Record<'optInToAsset(uint64,uint64,pay)void' | 'optInToAsset', {
      argsObj: OptInPluginArgs['obj']['optInToAsset(uint64,uint64,pay)void']
      argsTuple: OptInPluginArgs['tuple']['optInToAsset(uint64,uint64,pay)void']
      returns: OptInPluginReturns['optInToAsset(uint64,uint64,pay)void']
    }>
}

/**
 * Defines the possible abi call signatures.
 */
export type OptInPluginSignatures = keyof OptInPluginTypes['methods']
/**
 * Defines the possible abi call signatures for methods that return a non-void value.
 */
export type OptInPluginNonVoidMethodSignatures = keyof OptInPluginTypes['methods'] extends infer T ? T extends keyof OptInPluginTypes['methods'] ? MethodReturn<T> extends void ? never : T  : never : never
/**
 * Defines an object containing all relevant parameters for a single call to the contract.
 */
export type CallParams<TArgs> = Expand<
  Omit<AppClientMethodCallParams, 'method' | 'args' | 'onComplete'> &
    {
      /** The args for the ABI method call, either as an ordered array or an object */
      args: Expand<TArgs>
    }
>
/**
 * Maps a method signature from the OptInPlugin smart contract to the method's arguments in either tuple or struct form
 */
export type MethodArgs<TSignature extends OptInPluginSignatures> = OptInPluginTypes['methods'][TSignature]['argsObj' | 'argsTuple']
/**
 * Maps a method signature from the OptInPlugin smart contract to the method's return type
 */
export type MethodReturn<TSignature extends OptInPluginSignatures> = OptInPluginTypes['methods'][TSignature]['returns']


/**
 * Defines supported create method params for this smart contract
 */
export type OptInPluginCreateCallParams =
  | Expand<CallParams<OptInPluginArgs['obj']['createApplication()void'] | OptInPluginArgs['tuple']['createApplication()void']> & {method: 'createApplication'} & {onComplete?: OnApplicationComplete.NoOpOC} & CreateSchema>
  | Expand<CallParams<OptInPluginArgs['obj']['createApplication()void'] | OptInPluginArgs['tuple']['createApplication()void']> & {method: 'createApplication()void'} & {onComplete?: OnApplicationComplete.NoOpOC} & CreateSchema>
/**
 * Defines arguments required for the deploy method.
 */
export type OptInPluginDeployParams = Expand<Omit<AppFactoryDeployParams, 'createParams' | 'updateParams' | 'deleteParams'> & {
  /**
   * Create transaction parameters to use if a create needs to be issued as part of deployment; use `method` to define ABI call (if available) or leave out for a bare call (if available)
   */
  createParams?: OptInPluginCreateCallParams
}>


/**
 * Exposes methods for constructing `AppClient` params objects for ABI calls to the OptInPlugin smart contract
 */
export abstract class OptInPluginParamsFactory {
  /**
   * Gets available create ABI call param factories
   */
  static get create() {
    return {
      _resolveByMethod<TParams extends OptInPluginCreateCallParams & {method: string}>(params: TParams) {
        switch(params.method) {
          case 'createApplication':
          case 'createApplication()void':
            return OptInPluginParamsFactory.create.createApplication(params)
        }
        throw new Error(`Unknown ' + verb + ' method`)
      },

      /**
       * Constructs create ABI call params for the OptInPlugin smart contract using the createApplication()void ABI method
       *
       * @param params Parameters for the call
       * @returns An `AppClientMethodCallParams` object for the call
       */
      createApplication(params: CallParams<OptInPluginArgs['obj']['createApplication()void'] | OptInPluginArgs['tuple']['createApplication()void']> & AppClientCompilationParams & {onComplete?: OnApplicationComplete.NoOpOC}): AppClientMethodCallParams & AppClientCompilationParams & {onComplete?: OnApplicationComplete.NoOpOC} {
        return {
          ...params,
          method: 'createApplication()void' as const,
          args: Array.isArray(params.args) ? params.args : [],
        }
      },
    }
  }

  /**
   * Constructs a no op call for the optInToAsset(uint64,uint64,pay)void ABI method
   *
   * @param params Parameters for the call
   * @returns An `AppClientMethodCallParams` object for the call
   */
  static optInToAsset(params: CallParams<OptInPluginArgs['obj']['optInToAsset(uint64,uint64,pay)void'] | OptInPluginArgs['tuple']['optInToAsset(uint64,uint64,pay)void']> & CallOnComplete): AppClientMethodCallParams & CallOnComplete {
    return {
      ...params,
      method: 'optInToAsset(uint64,uint64,pay)void' as const,
      args: Array.isArray(params.args) ? params.args : [params.args.sender, params.args.asset, params.args.mbrPayment],
    }
  }
}

/**
 * A factory to create and deploy one or more instance of the OptInPlugin smart contract and to create one or more app clients to interact with those (or other) app instances
 */
export class OptInPluginFactory {
  /**
   * The underlying `AppFactory` for when you want to have more flexibility
   */
  public readonly appFactory: _AppFactory

  /**
   * Creates a new instance of `OptInPluginFactory`
   *
   * @param params The parameters to initialise the app factory with
   */
  constructor(params: Omit<AppFactoryParams, 'appSpec'>) {
    this.appFactory = new _AppFactory({
      ...params,
      appSpec: APP_SPEC,
    })
  }
  
  /** The name of the app (from the ARC-32 / ARC-56 app spec or override). */
  public get appName() {
    return this.appFactory.appName
  }
  
  /** The ARC-56 app spec being used */
  get appSpec() {
    return APP_SPEC
  }
  
  /** A reference to the underlying `AlgorandClient` this app factory is using. */
  public get algorand(): AlgorandClientInterface {
    return this.appFactory.algorand
  }
  
  /**
   * Returns a new `AppClient` client for an app instance of the given ID.
   *
   * Automatically populates appName, defaultSender and source maps from the factory
   * if not specified in the params.
   * @param params The parameters to create the app client
   * @returns The `AppClient`
   */
  public getAppClientById(params: AppFactoryAppClientParams) {
    return new OptInPluginClient(this.appFactory.getAppClientById(params))
  }
  
  /**
   * Returns a new `AppClient` client, resolving the app by creator address and name
   * using AlgoKit app deployment semantics (i.e. looking for the app creation transaction note).
   *
   * Automatically populates appName, defaultSender and source maps from the factory
   * if not specified in the params.
   * @param params The parameters to create the app client
   * @returns The `AppClient`
   */
  public async getAppClientByCreatorAndName(
    params: AppFactoryResolveAppClientByCreatorAndNameParams,
  ) {
    return new OptInPluginClient(await this.appFactory.getAppClientByCreatorAndName(params))
  }

  /**
   * Idempotently deploys the OptInPlugin smart contract.
   *
   * @param params The arguments for the contract calls and any additional parameters for the call
   * @returns The deployment result
   */
  public async deploy(params: OptInPluginDeployParams = {}) {
    const result = await this.appFactory.deploy({
      ...params,
      createParams: params.createParams?.method ? OptInPluginParamsFactory.create._resolveByMethod(params.createParams) : params.createParams ? params.createParams as (OptInPluginCreateCallParams & { args: Uint8Array[] }) : undefined,
    })
    return { result: result.result, appClient: new OptInPluginClient(result.appClient) }
  }

  /**
   * Get parameters to create transactions (create and deploy related calls) for the current app. A good mental model for this is that these parameters represent a deferred transaction creation.
   */
  readonly params = {
    /**
     * Gets available create methods
     */
    create: {
      /**
       * Creates a new instance of the OptInPlugin smart contract using the createApplication()void ABI method.
       *
       * @param params The params for the smart contract call
       * @returns The create params
       */
      createApplication: (params: CallParams<OptInPluginArgs['obj']['createApplication()void'] | OptInPluginArgs['tuple']['createApplication()void']> & AppClientCompilationParams & CreateSchema & {onComplete?: OnApplicationComplete.NoOpOC} = {args: []}) => {
        return this.appFactory.params.create(OptInPluginParamsFactory.create.createApplication(params))
      },
    },

  }

  /**
   * Create transactions for the current app
   */
  readonly createTransaction = {
    /**
     * Gets available create methods
     */
    create: {
      /**
       * Creates a new instance of the OptInPlugin smart contract using the createApplication()void ABI method.
       *
       * @param params The params for the smart contract call
       * @returns The create transaction
       */
      createApplication: (params: CallParams<OptInPluginArgs['obj']['createApplication()void'] | OptInPluginArgs['tuple']['createApplication()void']> & AppClientCompilationParams & CreateSchema & {onComplete?: OnApplicationComplete.NoOpOC} = {args: []}) => {
        return this.appFactory.createTransaction.create(OptInPluginParamsFactory.create.createApplication(params))
      },
    },

  }

  /**
   * Send calls to the current app
   */
  readonly send = {
    /**
     * Gets available create methods
     */
    create: {
      /**
       * Creates a new instance of the OptInPlugin smart contract using an ABI method call using the createApplication()void ABI method.
       *
       * @param params The params for the smart contract call
       * @returns The create result
       */
      createApplication: async (params: CallParams<OptInPluginArgs['obj']['createApplication()void'] | OptInPluginArgs['tuple']['createApplication()void']> & AppClientCompilationParams & CreateSchema & SendParams & {onComplete?: OnApplicationComplete.NoOpOC} = {args: []}) => {
        const result = await this.appFactory.send.create(OptInPluginParamsFactory.create.createApplication(params))
        return { result: { ...result.result, return: result.result.return as unknown as (undefined | OptInPluginReturns['createApplication()void']) }, appClient: new OptInPluginClient(result.appClient) }
      },
    },

  }

}
/**
 * A client to make calls to the OptInPlugin smart contract
 */
export class OptInPluginClient {
  /**
   * The underlying `AppClient` for when you want to have more flexibility
   */
  public readonly appClient: _AppClient

  /**
   * Creates a new instance of `OptInPluginClient`
   *
   * @param appClient An `AppClient` instance which has been created with the OptInPlugin app spec
   */
  constructor(appClient: _AppClient)
  /**
   * Creates a new instance of `OptInPluginClient`
   *
   * @param params The parameters to initialise the app client with
   */
  constructor(params: Omit<AppClientParams, 'appSpec'>)
  constructor(appClientOrParams: _AppClient | Omit<AppClientParams, 'appSpec'>) {
    this.appClient = appClientOrParams instanceof _AppClient ? appClientOrParams : new _AppClient({
      ...appClientOrParams,
      appSpec: APP_SPEC,
    })
  }
  
  /**
   * Checks for decode errors on the given return value and maps the return value to the return type for the given method
   * @returns The typed return value or undefined if there was no value
   */
  decodeReturnValue<TSignature extends OptInPluginNonVoidMethodSignatures>(method: TSignature, returnValue: ABIReturn | undefined) {
    return returnValue !== undefined ? getArc56ReturnValue<MethodReturn<TSignature>>(returnValue, this.appClient.getABIMethod(method), APP_SPEC.structs) : undefined
  }
  
  /**
   * Returns a new `OptInPluginClient` client, resolving the app by creator address and name
   * using AlgoKit app deployment semantics (i.e. looking for the app creation transaction note).
   * @param params The parameters to create the app client
   */
  public static async fromCreatorAndName(params: Omit<ResolveAppClientByCreatorAndName, 'appSpec'>): Promise<OptInPluginClient> {
    return new OptInPluginClient(await _AppClient.fromCreatorAndName({...params, appSpec: APP_SPEC}))
  }
  
  /**
   * Returns an `OptInPluginClient` instance for the current network based on
   * pre-determined network-specific app IDs specified in the ARC-56 app spec.
   *
   * If no IDs are in the app spec or the network isn't recognised, an error is thrown.
   * @param params The parameters to create the app client
   */
  static async fromNetwork(
    params: Omit<ResolveAppClientByNetwork, 'appSpec'>
  ): Promise<OptInPluginClient> {
    return new OptInPluginClient(await _AppClient.fromNetwork({...params, appSpec: APP_SPEC}))
  }
  
  /** The ID of the app instance this client is linked to. */
  public get appId() {
    return this.appClient.appId
  }
  
  /** The app address of the app instance this client is linked to. */
  public get appAddress() {
    return this.appClient.appAddress
  }
  
  /** The name of the app. */
  public get appName() {
    return this.appClient.appName
  }
  
  /** The ARC-56 app spec being used */
  public get appSpec() {
    return this.appClient.appSpec
  }
  
  /** A reference to the underlying `AlgorandClient` this app client is using. */
  public get algorand(): AlgorandClientInterface {
    return this.appClient.algorand
  }

  /**
   * Get parameters to create transactions for the current app. A good mental model for this is that these parameters represent a deferred transaction creation.
   */
  readonly params = {
    /**
     * Makes a clear_state call to an existing instance of the OptInPlugin smart contract.
     *
     * @param params The params for the bare (raw) call
     * @returns The clearState result
     */
    clearState: (params?: Expand<AppClientBareCallParams>) => {
      return this.appClient.params.bare.clearState(params)
    },

    /**
     * Makes a call to the OptInPlugin smart contract using the `optInToAsset(uint64,uint64,pay)void` ABI method.
     *
     * @param params The params for the smart contract call
     * @returns The call params
     */
    optInToAsset: (params: CallParams<OptInPluginArgs['obj']['optInToAsset(uint64,uint64,pay)void'] | OptInPluginArgs['tuple']['optInToAsset(uint64,uint64,pay)void']> & {onComplete?: OnApplicationComplete.NoOpOC}) => {
      return this.appClient.params.call(OptInPluginParamsFactory.optInToAsset(params))
    },

  }

  /**
   * Create transactions for the current app
   */
  readonly createTransaction = {
    /**
     * Makes a clear_state call to an existing instance of the OptInPlugin smart contract.
     *
     * @param params The params for the bare (raw) call
     * @returns The clearState result
     */
    clearState: (params?: Expand<AppClientBareCallParams>) => {
      return this.appClient.createTransaction.bare.clearState(params)
    },

    /**
     * Makes a call to the OptInPlugin smart contract using the `optInToAsset(uint64,uint64,pay)void` ABI method.
     *
     * @param params The params for the smart contract call
     * @returns The call transaction
     */
    optInToAsset: (params: CallParams<OptInPluginArgs['obj']['optInToAsset(uint64,uint64,pay)void'] | OptInPluginArgs['tuple']['optInToAsset(uint64,uint64,pay)void']> & {onComplete?: OnApplicationComplete.NoOpOC}) => {
      return this.appClient.createTransaction.call(OptInPluginParamsFactory.optInToAsset(params))
    },

  }

  /**
   * Send calls to the current app
   */
  readonly send = {
    /**
     * Makes a clear_state call to an existing instance of the OptInPlugin smart contract.
     *
     * @param params The params for the bare (raw) call
     * @returns The clearState result
     */
    clearState: (params?: Expand<AppClientBareCallParams & SendParams>) => {
      return this.appClient.send.bare.clearState(params)
    },

    /**
     * Makes a call to the OptInPlugin smart contract using the `optInToAsset(uint64,uint64,pay)void` ABI method.
     *
     * @param params The params for the smart contract call
     * @returns The call result
     */
    optInToAsset: async (params: CallParams<OptInPluginArgs['obj']['optInToAsset(uint64,uint64,pay)void'] | OptInPluginArgs['tuple']['optInToAsset(uint64,uint64,pay)void']> & SendParams & {onComplete?: OnApplicationComplete.NoOpOC}) => {
      const result = await this.appClient.send.call(OptInPluginParamsFactory.optInToAsset(params))
      return {...result, return: result.return as unknown as (undefined | OptInPluginReturns['optInToAsset(uint64,uint64,pay)void'])}
    },

  }

  /**
   * Clone this app client with different params
   *
   * @param params The params to use for the the cloned app client. Omit a param to keep the original value. Set a param to override the original value. Setting to undefined will clear the original value.
   * @returns A new app client with the altered params
   */
  public clone(params: CloneAppClientParams) {
    return new OptInPluginClient(this.appClient.clone(params))
  }

  /**
   * Methods to access state for the current OptInPlugin app
   */
  state = {
  }

  public newGroup(): OptInPluginComposer {
    const client = this
    const composer = this.algorand.newGroup()
    let promiseChain:Promise<unknown> = Promise.resolve()
    const resultMappers: Array<undefined | ((x: ABIReturn | undefined) => any)> = []
    return {
      /**
       * Add a optInToAsset(uint64,uint64,pay)void method call against the OptInPlugin contract
       */
      optInToAsset(params: CallParams<OptInPluginArgs['obj']['optInToAsset(uint64,uint64,pay)void'] | OptInPluginArgs['tuple']['optInToAsset(uint64,uint64,pay)void']> & {onComplete?: OnApplicationComplete.NoOpOC}) {
        promiseChain = promiseChain.then(async () => composer.addAppCallMethodCall(await client.params.optInToAsset(params)))
        resultMappers.push(undefined)
        return this
      },
      /**
       * Add a clear state call to the OptInPlugin contract
       */
      clearState(params: AppClientBareCallParams) {
        promiseChain = promiseChain.then(() => composer.addAppCall(client.params.clearState(params)))
        return this
      },
      addTransaction(txn: Transaction, signer?: TransactionSigner) {
        promiseChain = promiseChain.then(() => composer.addTransaction(txn, signer))
        return this
      },
      async composer() {
        await promiseChain
        return composer
      },
      async simulate(options?: SimulateOptions) {
        await promiseChain
        const result = await (!options ? composer.simulate() : composer.simulate(options))
        return {
          ...result,
          returns: result.returns?.map((val, i) => resultMappers[i] !== undefined ? resultMappers[i]!(val) : val.returnValue)
        }
      },
      async send(params?: SendParams) {
        await promiseChain
        const result = await composer.send(params)
        return {
          ...result,
          returns: result.returns?.map((val, i) => resultMappers[i] !== undefined ? resultMappers[i]!(val) : val.returnValue)
        }
      }
    } as unknown as OptInPluginComposer
  }
}
export type OptInPluginComposer<TReturns extends [...any[]] = []> = {
  /**
   * Calls the optInToAsset(uint64,uint64,pay)void ABI method.
   *
   * @param args The arguments for the contract call
   * @param params Any additional parameters for the call
   * @returns The typed transaction composer so you can fluently chain multiple calls or call execute to execute all queued up transactions
   */
  optInToAsset(params?: CallParams<OptInPluginArgs['obj']['optInToAsset(uint64,uint64,pay)void'] | OptInPluginArgs['tuple']['optInToAsset(uint64,uint64,pay)void']>): OptInPluginComposer<[...TReturns, OptInPluginReturns['optInToAsset(uint64,uint64,pay)void'] | undefined]>

  /**
   * Makes a clear_state call to an existing instance of the OptInPlugin smart contract.
   *
   * @param args The arguments for the bare call
   * @returns The typed transaction composer so you can fluently chain multiple calls or call execute to execute all queued up transactions
   */
  clearState(params?: AppClientBareCallParams): OptInPluginComposer<[...TReturns, undefined]>

  /**
   * Adds a transaction to the composer
   *
   * @param txn A transaction to add to the transaction group
   * @param signer The optional signer to use when signing this transaction.
   */
  addTransaction(txn: Transaction, signer?: TransactionSigner): OptInPluginComposer<TReturns>
  /**
   * Returns the underlying AtomicTransactionComposer instance
   */
  composer(): Promise<TransactionComposer>
  /**
   * Simulates the transaction group and returns the result
   */
  simulate(): Promise<OptInPluginComposerResults<TReturns> & { simulateResponse: SimulateResponse }>
  simulate(options: SkipSignaturesSimulateOptions): Promise<OptInPluginComposerResults<TReturns> & { simulateResponse: SimulateResponse }>
  simulate(options: RawSimulateOptions): Promise<OptInPluginComposerResults<TReturns> & { simulateResponse: SimulateResponse }>
  /**
   * Sends the transaction group to the network and returns the results
   */
  send(params?: SendParams): Promise<OptInPluginComposerResults<TReturns>>
}
export type OptInPluginComposerResults<TReturns extends [...any[]]> = Expand<SendAtomicTransactionComposerResults & {
  returns: TReturns
}>

