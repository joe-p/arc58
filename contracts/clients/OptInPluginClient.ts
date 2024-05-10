/* eslint-disable */
/**
 * This file was automatically generated by @algorandfoundation/algokit-client-generator.
 * DO NOT MODIFY IT BY HAND.
 * requires: @algorandfoundation/algokit-utils: ^2
 */
import * as algokit from '@algorandfoundation/algokit-utils'
import type {
  ABIAppCallArg,
  AppCallTransactionResult,
  AppCallTransactionResultOfType,
  AppCompilationResult,
  AppReference,
  AppState,
  CoreAppCallArgs,
  RawAppCallArgs,
  TealTemplateParams,
} from '@algorandfoundation/algokit-utils/types/app'
import type {
  AppClientCallCoreParams,
  AppClientCompilationParams,
  AppClientDeployCoreParams,
  AppDetails,
  ApplicationClient,
} from '@algorandfoundation/algokit-utils/types/app-client'
import type { AppSpec } from '@algorandfoundation/algokit-utils/types/app-spec'
import type { SendTransactionResult, TransactionToSign, SendTransactionFrom, SendTransactionParams } from '@algorandfoundation/algokit-utils/types/transaction'
import type { ABIResult, TransactionWithSigner } from 'algosdk'
import { Algodv2, OnApplicationComplete, Transaction, AtomicTransactionComposer, modelsv2 } from 'algosdk'
export const APP_SPEC: AppSpec = {
  "hints": {
    "optInToAsset(address,uint64,pay)void": {
      "call_config": {
        "no_op": "CALL"
      }
    },
    "createApplication()void": {
      "call_config": {
        "no_op": "CREATE"
      }
    }
  },
  "bare_call_config": {
    "no_op": "NEVER",
    "opt_in": "NEVER",
    "close_out": "NEVER",
    "update_application": "NEVER",
    "delete_application": "NEVER"
  },
  "schema": {
    "local": {
      "declared": {},
      "reserved": {}
    },
    "global": {
      "declared": {},
      "reserved": {}
    }
  },
  "state": {
    "global": {
      "num_byte_slices": 0,
      "num_uints": 0
    },
    "local": {
      "num_byte_slices": 0,
      "num_uints": 0
    }
  },
  "source": {
    "approval": "I3ByYWdtYSB2ZXJzaW9uIDEwCgovLyBUaGlzIFRFQUwgd2FzIGdlbmVyYXRlZCBieSBURUFMU2NyaXB0IHYwLjkwLjIKLy8gaHR0cHM6Ly9naXRodWIuY29tL2FsZ29yYW5kZm91bmRhdGlvbi9URUFMU2NyaXB0CgovLyBUaGlzIGNvbnRyYWN0IGlzIGNvbXBsaWFudCB3aXRoIGFuZC9vciBpbXBsZW1lbnRzIHRoZSBmb2xsb3dpbmcgQVJDczogWyBBUkM0IF0KCi8vIFRoZSBmb2xsb3dpbmcgdGVuIGxpbmVzIG9mIFRFQUwgaGFuZGxlIGluaXRpYWwgcHJvZ3JhbSBmbG93Ci8vIFRoaXMgcGF0dGVybiBpcyB1c2VkIHRvIG1ha2UgaXQgZWFzeSBmb3IgYW55b25lIHRvIHBhcnNlIHRoZSBzdGFydCBvZiB0aGUgcHJvZ3JhbSBhbmQgZGV0ZXJtaW5lIGlmIGEgc3BlY2lmaWMgYWN0aW9uIGlzIGFsbG93ZWQKLy8gSGVyZSwgYWN0aW9uIHJlZmVycyB0byB0aGUgT25Db21wbGV0ZSBpbiBjb21iaW5hdGlvbiB3aXRoIHdoZXRoZXIgdGhlIGFwcCBpcyBiZWluZyBjcmVhdGVkIG9yIGNhbGxlZAovLyBFdmVyeSBwb3NzaWJsZSBhY3Rpb24gZm9yIHRoaXMgY29udHJhY3QgaXMgcmVwcmVzZW50ZWQgaW4gdGhlIHN3aXRjaCBzdGF0ZW1lbnQKLy8gSWYgdGhlIGFjdGlvbiBpcyBub3QgaW1wbGVtZW50ZWQgaW4gdGhlIGNvbnRyYWN0LCBpdHMgcmVzcGVjdGl2ZSBicmFuY2ggd2lsbCBiZSAiKk5PVF9JTVBMRU1FTlRFRCIgd2hpY2gganVzdCBjb250YWlucyAiZXJyIgp0eG4gQXBwbGljYXRpb25JRAohCmludCA2CioKdHhuIE9uQ29tcGxldGlvbgorCnN3aXRjaCAqY2FsbF9Ob09wICpOT1RfSU1QTEVNRU5URUQgKk5PVF9JTVBMRU1FTlRFRCAqTk9UX0lNUExFTUVOVEVEICpOT1RfSU1QTEVNRU5URUQgKk5PVF9JTVBMRU1FTlRFRCAqY3JlYXRlX05vT3AgKk5PVF9JTVBMRU1FTlRFRCAqTk9UX0lNUExFTUVOVEVEICpOT1RfSU1QTEVNRU5URUQgKk5PVF9JTVBMRU1FTlRFRCAqTk9UX0lNUExFTUVOVEVECgoqTk9UX0lNUExFTUVOVEVEOgoJZXJyCgovLyBvcHRJblRvQXNzZXQoYWRkcmVzcyx1aW50NjQscGF5KXZvaWQKKmFiaV9yb3V0ZV9vcHRJblRvQXNzZXQ6CgkvLyBtYnJQYXltZW50OiBwYXkKCXR4biBHcm91cEluZGV4CglpbnQgMQoJLQoJZHVwCglndHhucyBUeXBlRW51bQoJaW50IHBheQoJPT0KCWFzc2VydAoKCS8vIGFzc2V0OiB1aW50NjQKCXR4bmEgQXBwbGljYXRpb25BcmdzIDIKCWJ0b2kKCgkvLyBzZW5kZXI6IGFkZHJlc3MKCXR4bmEgQXBwbGljYXRpb25BcmdzIDEKCWR1cAoJbGVuCglpbnQgMzIKCT09Cglhc3NlcnQKCgkvLyBleGVjdXRlIG9wdEluVG9Bc3NldChhZGRyZXNzLHVpbnQ2NCxwYXkpdm9pZAoJY2FsbHN1YiBvcHRJblRvQXNzZXQKCWludCAxCglyZXR1cm4KCi8vIG9wdEluVG9Bc3NldChzZW5kZXI6IEFkZHJlc3MsIGFzc2V0OiBBc3NldElELCBtYnJQYXltZW50OiBQYXlUeG4pOiB2b2lkCm9wdEluVG9Bc3NldDoKCXByb3RvIDMgMAoKCS8vIGNvbnRyYWN0cy9wbHVnaW5zL29wdGluX3BsdWdpbi5hbGdvLnRzOjcKCS8vIHZlcmlmeVBheVR4bihtYnJQYXltZW50LCB7CgkvLyAgICAgICByZWNlaXZlcjogc2VuZGVyLAoJLy8gICAgICAgYW1vdW50OiB7CgkvLyAgICAgICAgIGdyZWF0ZXJUaGFuRXF1YWxUbzogZ2xvYmFscy5hc3NldE9wdEluTWluQmFsYW5jZSwKCS8vICAgICAgIH0sCgkvLyAgICAgfSkKCS8vIHZlcmlmeSByZWNlaXZlcgoJZnJhbWVfZGlnIC0zIC8vIG1iclBheW1lbnQ6IFBheVR4bgoJZ3R4bnMgUmVjZWl2ZXIKCWZyYW1lX2RpZyAtMSAvLyBzZW5kZXI6IEFkZHJlc3MKCT09Cglhc3NlcnQKCgkvLyB2ZXJpZnkgYW1vdW50CglmcmFtZV9kaWcgLTMgLy8gbWJyUGF5bWVudDogUGF5VHhuCglndHhucyBBbW91bnQKCWdsb2JhbCBBc3NldE9wdEluTWluQmFsYW5jZQoJPj0KCWFzc2VydAoKCS8vIGNvbnRyYWN0cy9wbHVnaW5zL29wdGluX3BsdWdpbi5hbGdvLnRzOjE0CgkvLyBzZW5kQXNzZXRUcmFuc2Zlcih7CgkvLyAgICAgICBzZW5kZXI6IHNlbmRlciwKCS8vICAgICAgIGFzc2V0UmVjZWl2ZXI6IHNlbmRlciwKCS8vICAgICAgIGFzc2V0QW1vdW50OiAwLAoJLy8gICAgICAgeGZlckFzc2V0OiBhc3NldCwKCS8vICAgICAgIHJla2V5VG86IHNlbmRlciwKCS8vICAgICB9KQoJaXR4bl9iZWdpbgoJaW50IGF4ZmVyCglpdHhuX2ZpZWxkIFR5cGVFbnVtCgoJLy8gY29udHJhY3RzL3BsdWdpbnMvb3B0aW5fcGx1Z2luLmFsZ28udHM6MTUKCS8vIHNlbmRlcjogc2VuZGVyCglmcmFtZV9kaWcgLTEgLy8gc2VuZGVyOiBBZGRyZXNzCglpdHhuX2ZpZWxkIFNlbmRlcgoKCS8vIGNvbnRyYWN0cy9wbHVnaW5zL29wdGluX3BsdWdpbi5hbGdvLnRzOjE2CgkvLyBhc3NldFJlY2VpdmVyOiBzZW5kZXIKCWZyYW1lX2RpZyAtMSAvLyBzZW5kZXI6IEFkZHJlc3MKCWl0eG5fZmllbGQgQXNzZXRSZWNlaXZlcgoKCS8vIGNvbnRyYWN0cy9wbHVnaW5zL29wdGluX3BsdWdpbi5hbGdvLnRzOjE3CgkvLyBhc3NldEFtb3VudDogMAoJaW50IDAKCWl0eG5fZmllbGQgQXNzZXRBbW91bnQKCgkvLyBjb250cmFjdHMvcGx1Z2lucy9vcHRpbl9wbHVnaW4uYWxnby50czoxOAoJLy8geGZlckFzc2V0OiBhc3NldAoJZnJhbWVfZGlnIC0yIC8vIGFzc2V0OiBBc3NldElECglpdHhuX2ZpZWxkIFhmZXJBc3NldAoKCS8vIGNvbnRyYWN0cy9wbHVnaW5zL29wdGluX3BsdWdpbi5hbGdvLnRzOjE5CgkvLyByZWtleVRvOiBzZW5kZXIKCWZyYW1lX2RpZyAtMSAvLyBzZW5kZXI6IEFkZHJlc3MKCWl0eG5fZmllbGQgUmVrZXlUbwoKCS8vIEZlZSBmaWVsZCBub3Qgc2V0LCBkZWZhdWx0aW5nIHRvIDAKCWludCAwCglpdHhuX2ZpZWxkIEZlZQoKCS8vIFN1Ym1pdCBpbm5lciB0cmFuc2FjdGlvbgoJaXR4bl9zdWJtaXQKCXJldHN1YgoKKmFiaV9yb3V0ZV9jcmVhdGVBcHBsaWNhdGlvbjoKCWludCAxCglyZXR1cm4KCipjcmVhdGVfTm9PcDoKCW1ldGhvZCAiY3JlYXRlQXBwbGljYXRpb24oKXZvaWQiCgl0eG5hIEFwcGxpY2F0aW9uQXJncyAwCgltYXRjaCAqYWJpX3JvdXRlX2NyZWF0ZUFwcGxpY2F0aW9uCgllcnIKCipjYWxsX05vT3A6CgltZXRob2QgIm9wdEluVG9Bc3NldChhZGRyZXNzLHVpbnQ2NCxwYXkpdm9pZCIKCXR4bmEgQXBwbGljYXRpb25BcmdzIDAKCW1hdGNoICphYmlfcm91dGVfb3B0SW5Ub0Fzc2V0CgllcnI=",
    "clear": "I3ByYWdtYSB2ZXJzaW9uIDEw"
  },
  "contract": {
    "name": "OptInPlugin",
    "desc": "",
    "methods": [
      {
        "name": "optInToAsset",
        "args": [
          {
            "name": "sender",
            "type": "address"
          },
          {
            "name": "asset",
            "type": "uint64"
          },
          {
            "name": "mbrPayment",
            "type": "pay"
          }
        ],
        "returns": {
          "type": "void"
        }
      },
      {
        "name": "createApplication",
        "args": [],
        "returns": {
          "type": "void"
        }
      }
    ]
  }
}

/**
 * Defines an onCompletionAction of 'no_op'
 */
export type OnCompleteNoOp =  { onCompleteAction?: 'no_op' | OnApplicationComplete.NoOpOC }
/**
 * Defines an onCompletionAction of 'opt_in'
 */
export type OnCompleteOptIn =  { onCompleteAction: 'opt_in' | OnApplicationComplete.OptInOC }
/**
 * Defines an onCompletionAction of 'close_out'
 */
export type OnCompleteCloseOut =  { onCompleteAction: 'close_out' | OnApplicationComplete.CloseOutOC }
/**
 * Defines an onCompletionAction of 'delete_application'
 */
export type OnCompleteDelApp =  { onCompleteAction: 'delete_application' | OnApplicationComplete.DeleteApplicationOC }
/**
 * Defines an onCompletionAction of 'update_application'
 */
export type OnCompleteUpdApp =  { onCompleteAction: 'update_application' | OnApplicationComplete.UpdateApplicationOC }
/**
 * A state record containing a single unsigned integer
 */
export type IntegerState = {
  /**
   * Gets the state value as a BigInt.
   */
  asBigInt(): bigint
  /**
   * Gets the state value as a number.
   */
  asNumber(): number
}
/**
 * A state record containing binary data
 */
export type BinaryState = {
  /**
   * Gets the state value as a Uint8Array
   */
  asByteArray(): Uint8Array
  /**
   * Gets the state value as a string
   */
  asString(): string
}

export type AppCreateCallTransactionResult = AppCallTransactionResult & Partial<AppCompilationResult> & AppReference
export type AppUpdateCallTransactionResult = AppCallTransactionResult & Partial<AppCompilationResult>

export type AppClientComposeCallCoreParams = Omit<AppClientCallCoreParams, 'sendParams'> & {
  sendParams?: Omit<SendTransactionParams, 'skipSending' | 'atc' | 'skipWaiting' | 'maxRoundsToWaitForConfirmation' | 'populateAppCallResources'>
}
export type AppClientComposeExecuteParams = Pick<SendTransactionParams, 'skipWaiting' | 'maxRoundsToWaitForConfirmation' | 'populateAppCallResources' | 'suppressLog'>

/**
 * Defines the types of available calls and state of the OptInPlugin smart contract.
 */
export type OptInPlugin = {
  /**
   * Maps method signatures / names to their argument and return types.
   */
  methods:
    & Record<'optInToAsset(address,uint64,pay)void' | 'optInToAsset', {
      argsObj: {
        sender: string
        asset: bigint | number
        mbrPayment: TransactionToSign | Transaction | Promise<SendTransactionResult>
      }
      argsTuple: [sender: string, asset: bigint | number, mbrPayment: TransactionToSign | Transaction | Promise<SendTransactionResult>]
      returns: void
    }>
    & Record<'createApplication()void' | 'createApplication', {
      argsObj: {
      }
      argsTuple: []
      returns: void
    }>
}
/**
 * Defines the possible abi call signatures
 */
export type OptInPluginSig = keyof OptInPlugin['methods']
/**
 * Defines an object containing all relevant parameters for a single call to the contract. Where TSignature is undefined, a bare call is made
 */
export type TypedCallParams<TSignature extends OptInPluginSig | undefined> = {
  method: TSignature
  methodArgs: TSignature extends undefined ? undefined : Array<ABIAppCallArg | undefined>
} & AppClientCallCoreParams & CoreAppCallArgs
/**
 * Defines the arguments required for a bare call
 */
export type BareCallArgs = Omit<RawAppCallArgs, keyof CoreAppCallArgs>
/**
 * Maps a method signature from the OptInPlugin smart contract to the method's arguments in either tuple of struct form
 */
export type MethodArgs<TSignature extends OptInPluginSig> = OptInPlugin['methods'][TSignature]['argsObj' | 'argsTuple']
/**
 * Maps a method signature from the OptInPlugin smart contract to the method's return type
 */
export type MethodReturn<TSignature extends OptInPluginSig> = OptInPlugin['methods'][TSignature]['returns']

/**
 * A factory for available 'create' calls
 */
export type OptInPluginCreateCalls = (typeof OptInPluginCallFactory)['create']
/**
 * Defines supported create methods for this smart contract
 */
export type OptInPluginCreateCallParams =
  | (TypedCallParams<'createApplication()void'> & (OnCompleteNoOp))
/**
 * Defines arguments required for the deploy method.
 */
export type OptInPluginDeployArgs = {
  deployTimeParams?: TealTemplateParams
  /**
   * A delegate which takes a create call factory and returns the create call params for this smart contract
   */
  createCall?: (callFactory: OptInPluginCreateCalls) => OptInPluginCreateCallParams
}


/**
 * Exposes methods for constructing all available smart contract calls
 */
export abstract class OptInPluginCallFactory {
  /**
   * Gets available create call factories
   */
  static get create() {
    return {
      /**
       * Constructs a create call for the OptInPlugin smart contract using the createApplication()void ABI method
       *
       * @param args Any args for the contract call
       * @param params Any additional parameters for the call
       * @returns A TypedCallParams object for the call
       */
      createApplication(args: MethodArgs<'createApplication()void'>, params: AppClientCallCoreParams & CoreAppCallArgs & AppClientCompilationParams & (OnCompleteNoOp) = {}) {
        return {
          method: 'createApplication()void' as const,
          methodArgs: Array.isArray(args) ? args : [],
          ...params,
        }
      },
    }
  }

  /**
   * Constructs a no op call for the optInToAsset(address,uint64,pay)void ABI method
   *
   * @param args Any args for the contract call
   * @param params Any additional parameters for the call
   * @returns A TypedCallParams object for the call
   */
  static optInToAsset(args: MethodArgs<'optInToAsset(address,uint64,pay)void'>, params: AppClientCallCoreParams & CoreAppCallArgs) {
    return {
      method: 'optInToAsset(address,uint64,pay)void' as const,
      methodArgs: Array.isArray(args) ? args : [args.sender, args.asset, args.mbrPayment],
      ...params,
    }
  }
}

/**
 * A client to make calls to the OptInPlugin smart contract
 */
export class OptInPluginClient {
  /**
   * The underlying `ApplicationClient` for when you want to have more flexibility
   */
  public readonly appClient: ApplicationClient

  private readonly sender: SendTransactionFrom | undefined

  /**
   * Creates a new instance of `OptInPluginClient`
   *
   * @param appDetails appDetails The details to identify the app to deploy
   * @param algod An algod client instance
   */
  constructor(appDetails: AppDetails, private algod: Algodv2) {
    this.sender = appDetails.sender
    this.appClient = algokit.getAppClient({
      ...appDetails,
      app: APP_SPEC
    }, algod)
  }

  /**
   * Checks for decode errors on the AppCallTransactionResult and maps the return value to the specified generic type
   *
   * @param result The AppCallTransactionResult to be mapped
   * @param returnValueFormatter An optional delegate to format the return value if required
   * @returns The smart contract response with an updated return value
   */
  protected mapReturnValue<TReturn, TResult extends AppCallTransactionResult = AppCallTransactionResult>(result: AppCallTransactionResult, returnValueFormatter?: (value: any) => TReturn): AppCallTransactionResultOfType<TReturn> & TResult {
    if(result.return?.decodeError) {
      throw result.return.decodeError
    }
    const returnValue = result.return?.returnValue !== undefined && returnValueFormatter !== undefined
      ? returnValueFormatter(result.return.returnValue)
      : result.return?.returnValue as TReturn | undefined
      return { ...result, return: returnValue } as AppCallTransactionResultOfType<TReturn> & TResult
  }

  /**
   * Calls the ABI method with the matching signature using an onCompletion code of NO_OP
   *
   * @param typedCallParams An object containing the method signature, args, and any other relevant parameters
   * @param returnValueFormatter An optional delegate which when provided will be used to map non-undefined return values to the target type
   * @returns The result of the smart contract call
   */
  public async call<TSignature extends keyof OptInPlugin['methods']>(typedCallParams: TypedCallParams<TSignature>, returnValueFormatter?: (value: any) => MethodReturn<TSignature>) {
    return this.mapReturnValue<MethodReturn<TSignature>>(await this.appClient.call(typedCallParams), returnValueFormatter)
  }

  /**
   * Idempotently deploys the OptInPlugin smart contract.
   *
   * @param params The arguments for the contract calls and any additional parameters for the call
   * @returns The deployment result
   */
  public deploy(params: OptInPluginDeployArgs & AppClientDeployCoreParams = {}): ReturnType<ApplicationClient['deploy']> {
    const createArgs = params.createCall?.(OptInPluginCallFactory.create)
    return this.appClient.deploy({
      ...params,
      createArgs,
      createOnCompleteAction: createArgs?.onCompleteAction,
    })
  }

  /**
   * Gets available create methods
   */
  public get create() {
    const $this = this
    return {
      /**
       * Creates a new instance of the OptInPlugin smart contract using the createApplication()void ABI method.
       *
       * @param args The arguments for the smart contract call
       * @param params Any additional parameters for the call
       * @returns The create result
       */
      async createApplication(args: MethodArgs<'createApplication()void'>, params: AppClientCallCoreParams & AppClientCompilationParams & (OnCompleteNoOp) = {}) {
        return $this.mapReturnValue<MethodReturn<'createApplication()void'>, AppCreateCallTransactionResult>(await $this.appClient.create(OptInPluginCallFactory.create.createApplication(args, params)))
      },
    }
  }

  /**
   * Makes a clear_state call to an existing instance of the OptInPlugin smart contract.
   *
   * @param args The arguments for the bare call
   * @returns The clear_state result
   */
  public clearState(args: BareCallArgs & AppClientCallCoreParams & CoreAppCallArgs = {}) {
    return this.appClient.clearState(args)
  }

  /**
   * Calls the optInToAsset(address,uint64,pay)void ABI method.
   *
   * @param args The arguments for the contract call
   * @param params Any additional parameters for the call
   * @returns The result of the call
   */
  public optInToAsset(args: MethodArgs<'optInToAsset(address,uint64,pay)void'>, params: AppClientCallCoreParams & CoreAppCallArgs = {}) {
    return this.call(OptInPluginCallFactory.optInToAsset(args, params))
  }

  public compose(): OptInPluginComposer {
    const client = this
    const atc = new AtomicTransactionComposer()
    let promiseChain:Promise<unknown> = Promise.resolve()
    const resultMappers: Array<undefined | ((x: any) => any)> = []
    return {
      optInToAsset(args: MethodArgs<'optInToAsset(address,uint64,pay)void'>, params?: AppClientComposeCallCoreParams & CoreAppCallArgs) {
        promiseChain = promiseChain.then(() => client.optInToAsset(args, {...params, sendParams: {...params?.sendParams, skipSending: true, atc}}))
        resultMappers.push(undefined)
        return this
      },
      clearState(args?: BareCallArgs & AppClientComposeCallCoreParams & CoreAppCallArgs) {
        promiseChain = promiseChain.then(() => client.clearState({...args, sendParams: {...args?.sendParams, skipSending: true, atc}}))
        resultMappers.push(undefined)
        return this
      },
      addTransaction(txn: TransactionWithSigner | TransactionToSign | Transaction | Promise<SendTransactionResult>, defaultSender?: SendTransactionFrom) {
        promiseChain = promiseChain.then(async () => atc.addTransaction(await algokit.getTransactionWithSigner(txn, defaultSender ?? client.sender)))
        return this
      },
      async atc() {
        await promiseChain
        return atc
      },
      async simulate(options?: SimulateOptions) {
        await promiseChain
        const result = await atc.simulate(client.algod, new modelsv2.SimulateRequest({ txnGroups: [], ...options }))
        return {
          ...result,
          returns: result.methodResults?.map((val, i) => resultMappers[i] !== undefined ? resultMappers[i]!(val.returnValue) : val.returnValue)
        }
      },
      async execute(sendParams?: AppClientComposeExecuteParams) {
        await promiseChain
        const result = await algokit.sendAtomicTransactionComposer({ atc, sendParams }, client.algod)
        return {
          ...result,
          returns: result.returns?.map((val, i) => resultMappers[i] !== undefined ? resultMappers[i]!(val.returnValue) : val.returnValue)
        }
      }
    } as unknown as OptInPluginComposer
  }
}
export type OptInPluginComposer<TReturns extends [...any[]] = []> = {
  /**
   * Calls the optInToAsset(address,uint64,pay)void ABI method.
   *
   * @param args The arguments for the contract call
   * @param params Any additional parameters for the call
   * @returns The typed transaction composer so you can fluently chain multiple calls or call execute to execute all queued up transactions
   */
  optInToAsset(args: MethodArgs<'optInToAsset(address,uint64,pay)void'>, params?: AppClientComposeCallCoreParams & CoreAppCallArgs): OptInPluginComposer<[...TReturns, MethodReturn<'optInToAsset(address,uint64,pay)void'>]>

  /**
   * Makes a clear_state call to an existing instance of the OptInPlugin smart contract.
   *
   * @param args The arguments for the bare call
   * @returns The typed transaction composer so you can fluently chain multiple calls or call execute to execute all queued up transactions
   */
  clearState(args?: BareCallArgs & AppClientComposeCallCoreParams & CoreAppCallArgs): OptInPluginComposer<[...TReturns, undefined]>

  /**
   * Adds a transaction to the composer
   *
   * @param txn One of: A TransactionWithSigner object (returned as is), a TransactionToSign object (signer is obtained from the signer property), a Transaction object (signer is extracted from the defaultSender parameter), an async SendTransactionResult returned by one of algokit utils helpers (signer is obtained from the defaultSender parameter)
   * @param defaultSender The default sender to be used to obtain a signer where the object provided to the transaction parameter does not include a signer.
   */
  addTransaction(txn: TransactionWithSigner | TransactionToSign | Transaction | Promise<SendTransactionResult>, defaultSender?: SendTransactionFrom): OptInPluginComposer<TReturns>
  /**
   * Returns the underlying AtomicTransactionComposer instance
   */
  atc(): Promise<AtomicTransactionComposer>
  /**
   * Simulates the transaction group and returns the result
   */
  simulate(options?: SimulateOptions): Promise<OptInPluginComposerSimulateResult<TReturns>>
  /**
   * Executes the transaction group and returns the results
   */
  execute(sendParams?: AppClientComposeExecuteParams): Promise<OptInPluginComposerResults<TReturns>>
}
export type SimulateOptions = Omit<ConstructorParameters<typeof modelsv2.SimulateRequest>[0], 'txnGroups'>
export type OptInPluginComposerSimulateResult<TReturns extends [...any[]]> = {
  returns: TReturns
  methodResults: ABIResult[]
  simulateResponse: modelsv2.SimulateResponse
}
export type OptInPluginComposerResults<TReturns extends [...any[]]> = {
  returns: TReturns
  groupId: string
  txIds: string[]
  transactions: Transaction[]
}
