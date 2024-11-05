/* eslint-disable */
// @ts-nocheck
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
  AppStorageSchema,
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
    "createApplication()void": {
      "call_config": {
        "no_op": "CREATE"
      }
    },
    "makePayment(address,address)void": {
      "call_config": {
        "no_op": "CALL"
      }
    }
  },
  "bare_call_config": {
    "no_op": "CREATE",
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
      "declared": {
        "lastPayment": {
          "type": "uint64",
          "key": "lastPayment"
        }
      },
      "reserved": {}
    }
  },
  "state": {
    "global": {
      "num_byte_slices": 0,
      "num_uints": 1
    },
    "local": {
      "num_byte_slices": 0,
      "num_uints": 0
    }
  },
  "source": {
    "approval": "I3ByYWdtYSB2ZXJzaW9uIDEwCgovLyBUaGlzIFRFQUwgd2FzIGdlbmVyYXRlZCBieSBURUFMU2NyaXB0IHYwLjEwMy4wCi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9hbGdvcmFuZGZvdW5kYXRpb24vVEVBTFNjcmlwdAoKLy8gVGhpcyBjb250cmFjdCBpcyBjb21wbGlhbnQgd2l0aCBhbmQvb3IgaW1wbGVtZW50cyB0aGUgZm9sbG93aW5nIEFSQ3M6IFsgQVJDNCBdCgovLyBUaGUgZm9sbG93aW5nIHRlbiBsaW5lcyBvZiBURUFMIGhhbmRsZSBpbml0aWFsIHByb2dyYW0gZmxvdwovLyBUaGlzIHBhdHRlcm4gaXMgdXNlZCB0byBtYWtlIGl0IGVhc3kgZm9yIGFueW9uZSB0byBwYXJzZSB0aGUgc3RhcnQgb2YgdGhlIHByb2dyYW0gYW5kIGRldGVybWluZSBpZiBhIHNwZWNpZmljIGFjdGlvbiBpcyBhbGxvd2VkCi8vIEhlcmUsIGFjdGlvbiByZWZlcnMgdG8gdGhlIE9uQ29tcGxldGUgaW4gY29tYmluYXRpb24gd2l0aCB3aGV0aGVyIHRoZSBhcHAgaXMgYmVpbmcgY3JlYXRlZCBvciBjYWxsZWQKLy8gRXZlcnkgcG9zc2libGUgYWN0aW9uIGZvciB0aGlzIGNvbnRyYWN0IGlzIHJlcHJlc2VudGVkIGluIHRoZSBzd2l0Y2ggc3RhdGVtZW50Ci8vIElmIHRoZSBhY3Rpb24gaXMgbm90IGltcGxlbWVudGVkIGluIHRoZSBjb250cmFjdCwgaXRzIHJlc3BlY3RpdmUgYnJhbmNoIHdpbGwgYmUgIipOT1RfSU1QTEVNRU5URUQiIHdoaWNoIGp1c3QgY29udGFpbnMgImVyciIKdHhuIEFwcGxpY2F0aW9uSUQKIQppbnQgNgoqCnR4biBPbkNvbXBsZXRpb24KKwpzd2l0Y2ggKmNhbGxfTm9PcCAqTk9UX0lNUExFTUVOVEVEICpOT1RfSU1QTEVNRU5URUQgKk5PVF9JTVBMRU1FTlRFRCAqTk9UX0lNUExFTUVOVEVEICpOT1RfSU1QTEVNRU5URUQgKmNyZWF0ZV9Ob09wICpOT1RfSU1QTEVNRU5URUQgKk5PVF9JTVBMRU1FTlRFRCAqTk9UX0lNUExFTUVOVEVEICpOT1RfSU1QTEVNRU5URUQgKk5PVF9JTVBMRU1FTlRFRAoKKk5PVF9JTVBMRU1FTlRFRDoKCS8vIFRoZSByZXF1ZXN0ZWQgYWN0aW9uIGlzIG5vdCBpbXBsZW1lbnRlZCBpbiB0aGlzIGNvbnRyYWN0LiBBcmUgeW91IHVzaW5nIHRoZSBjb3JyZWN0IE9uQ29tcGxldGU/IERpZCB5b3Ugc2V0IHlvdXIgYXBwIElEPwoJZXJyCgovLyBjcmVhdGVBcHBsaWNhdGlvbigpdm9pZAoqYWJpX3JvdXRlX2NyZWF0ZUFwcGxpY2F0aW9uOgoJLy8gZXhlY3V0ZSBjcmVhdGVBcHBsaWNhdGlvbigpdm9pZAoJY2FsbHN1YiBjcmVhdGVBcHBsaWNhdGlvbgoJaW50IDEKCXJldHVybgoKLy8gY3JlYXRlQXBwbGljYXRpb24oKTogdm9pZApjcmVhdGVBcHBsaWNhdGlvbjoKCXByb3RvIDAgMAoKCS8vIGNvbnRyYWN0cy9wbHVnaW5zL3N1YnNjcmlwdGlvbl9wbHVnaW4uYWxnby50czoxNwoJLy8gdGhpcy5sYXN0UGF5bWVudC52YWx1ZSA9IDAKCWJ5dGUgMHg2YzYxNzM3NDUwNjE3OTZkNjU2ZTc0IC8vICJsYXN0UGF5bWVudCIKCWludCAwCglhcHBfZ2xvYmFsX3B1dAoJcmV0c3ViCgovLyBtYWtlUGF5bWVudChhZGRyZXNzLGFkZHJlc3Mpdm9pZAoqYWJpX3JvdXRlX21ha2VQYXltZW50OgoJLy8gX2FjY3RSZWY6IGFkZHJlc3MKCXR4bmEgQXBwbGljYXRpb25BcmdzIDIKCWR1cAoJbGVuCglpbnQgMzIKCT09CgoJLy8gYXJndW1lbnQgMCAoX2FjY3RSZWYpIGZvciBtYWtlUGF5bWVudCBtdXN0IGJlIGEgYWRkcmVzcwoJYXNzZXJ0CgoJLy8gc2VuZGVyOiBhZGRyZXNzCgl0eG5hIEFwcGxpY2F0aW9uQXJncyAxCglkdXAKCWxlbgoJaW50IDMyCgk9PQoKCS8vIGFyZ3VtZW50IDEgKHNlbmRlcikgZm9yIG1ha2VQYXltZW50IG11c3QgYmUgYSBhZGRyZXNzCglhc3NlcnQKCgkvLyBleGVjdXRlIG1ha2VQYXltZW50KGFkZHJlc3MsYWRkcmVzcyl2b2lkCgljYWxsc3ViIG1ha2VQYXltZW50CglpbnQgMQoJcmV0dXJuCgovLyBtYWtlUGF5bWVudChzZW5kZXI6IEFkZHJlc3MsIF9hY2N0UmVmOiBBZGRyZXNzKTogdm9pZAptYWtlUGF5bWVudDoKCXByb3RvIDIgMAoKCS8vIGNvbnRyYWN0cy9wbHVnaW5zL3N1YnNjcmlwdGlvbl9wbHVnaW4uYWxnby50czoyNQoJLy8gYXNzZXJ0KGdsb2JhbHMucm91bmQgLSB0aGlzLmxhc3RQYXltZW50LnZhbHVlID4gRlJFUVVFTkNZKQoJZ2xvYmFsIFJvdW5kCglieXRlIDB4NmM2MTczNzQ1MDYxNzk2ZDY1NmU3NCAvLyAibGFzdFBheW1lbnQiCglhcHBfZ2xvYmFsX2dldAoJLQoJaW50IDEKCT4KCWFzc2VydAoKCS8vIGNvbnRyYWN0cy9wbHVnaW5zL3N1YnNjcmlwdGlvbl9wbHVnaW4uYWxnby50czoyNgoJLy8gdGhpcy5sYXN0UGF5bWVudC52YWx1ZSA9IGdsb2JhbHMucm91bmQKCWJ5dGUgMHg2YzYxNzM3NDUwNjE3OTZkNjU2ZTc0IC8vICJsYXN0UGF5bWVudCIKCWdsb2JhbCBSb3VuZAoJYXBwX2dsb2JhbF9wdXQKCgkvLyBjb250cmFjdHMvcGx1Z2lucy9zdWJzY3JpcHRpb25fcGx1Z2luLmFsZ28udHM6MjgKCS8vIHNlbmRQYXltZW50KHsKCS8vICAgICAgIHNlbmRlcjogc2VuZGVyLAoJLy8gICAgICAgYW1vdW50OiBBTU9VTlQsCgkvLyAgICAgICByZWNlaXZlcjogYWRkcignNDZYWVI3T1RSWlhJU0kyVFJTQkRXUFVWUVQ0RUNCV05JN1RGV1BQUzZFS0FQSjdXNU9CWFNORzY2TScpLAoJLy8gICAgICAgcmVrZXlUbzogc2VuZGVyLAoJLy8gICAgIH0pCglpdHhuX2JlZ2luCglpbnQgcGF5CglpdHhuX2ZpZWxkIFR5cGVFbnVtCgoJLy8gY29udHJhY3RzL3BsdWdpbnMvc3Vic2NyaXB0aW9uX3BsdWdpbi5hbGdvLnRzOjI5CgkvLyBzZW5kZXI6IHNlbmRlcgoJZnJhbWVfZGlnIC0xIC8vIHNlbmRlcjogQWRkcmVzcwoJaXR4bl9maWVsZCBTZW5kZXIKCgkvLyBjb250cmFjdHMvcGx1Z2lucy9zdWJzY3JpcHRpb25fcGx1Z2luLmFsZ28udHM6MzAKCS8vIGFtb3VudDogQU1PVU5UCglpbnQgMTAwMDAwCglpdHhuX2ZpZWxkIEFtb3VudAoKCS8vIGNvbnRyYWN0cy9wbHVnaW5zL3N1YnNjcmlwdGlvbl9wbHVnaW4uYWxnby50czozMQoJLy8gcmVjZWl2ZXI6IGFkZHIoJzQ2WFlSN09UUlpYSVNJMlRSU0JEV1BVVlFUNEVDQldOSTdURldQUFM2RUtBUEo3VzVPQlhTTkc2Nk0nKQoJYWRkciA0NlhZUjdPVFJaWElTSTJUUlNCRFdQVVZRVDRFQ0JXTkk3VEZXUFBTNkVLQVBKN1c1T0JYU05HNjZNCglpdHhuX2ZpZWxkIFJlY2VpdmVyCgoJLy8gY29udHJhY3RzL3BsdWdpbnMvc3Vic2NyaXB0aW9uX3BsdWdpbi5hbGdvLnRzOjMyCgkvLyByZWtleVRvOiBzZW5kZXIKCWZyYW1lX2RpZyAtMSAvLyBzZW5kZXI6IEFkZHJlc3MKCWl0eG5fZmllbGQgUmVrZXlUbwoKCS8vIEZlZSBmaWVsZCBub3Qgc2V0LCBkZWZhdWx0aW5nIHRvIDAKCWludCAwCglpdHhuX2ZpZWxkIEZlZQoKCS8vIFN1Ym1pdCBpbm5lciB0cmFuc2FjdGlvbgoJaXR4bl9zdWJtaXQKCXJldHN1YgoKKmNyZWF0ZV9Ob09wOgoJdHhuIE51bUFwcEFyZ3MKCWJ6ICphYmlfcm91dGVfY3JlYXRlQXBwbGljYXRpb24KCW1ldGhvZCAiY3JlYXRlQXBwbGljYXRpb24oKXZvaWQiCgl0eG5hIEFwcGxpY2F0aW9uQXJncyAwCgltYXRjaCAqYWJpX3JvdXRlX2NyZWF0ZUFwcGxpY2F0aW9uCgoJLy8gdGhpcyBjb250cmFjdCBkb2VzIG5vdCBpbXBsZW1lbnQgdGhlIGdpdmVuIEFCSSBtZXRob2QgZm9yIGNyZWF0ZSBOb09wCgllcnIKCipjYWxsX05vT3A6CgltZXRob2QgIm1ha2VQYXltZW50KGFkZHJlc3MsYWRkcmVzcyl2b2lkIgoJdHhuYSBBcHBsaWNhdGlvbkFyZ3MgMAoJbWF0Y2ggKmFiaV9yb3V0ZV9tYWtlUGF5bWVudAoKCS8vIHRoaXMgY29udHJhY3QgZG9lcyBub3QgaW1wbGVtZW50IHRoZSBnaXZlbiBBQkkgbWV0aG9kIGZvciBjYWxsIE5vT3AKCWVycg==",
    "clear": "I3ByYWdtYSB2ZXJzaW9uIDEw"
  },
  "contract": {
    "name": "SubscriptionPlugin",
    "desc": "",
    "methods": [
      {
        "name": "createApplication",
        "args": [],
        "returns": {
          "type": "void"
        }
      },
      {
        "name": "makePayment",
        "args": [
          {
            "name": "sender",
            "type": "address"
          },
          {
            "name": "_acctRef",
            "type": "address"
          }
        ],
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

export type IncludeSchema = {
  /**
   * Any overrides for the storage schema to request for the created app; by default the schema indicated by the app spec is used.
   */
  schema?: Partial<AppStorageSchema>
}

/**
 * Defines the types of available calls and state of the SubscriptionPlugin smart contract.
 */
export type SubscriptionPlugin = {
  /**
   * Maps method signatures / names to their argument and return types.
   */
  methods:
    & Record<'createApplication()void' | 'createApplication', {
      argsObj: {
      }
      argsTuple: []
      returns: void
    }>
    & Record<'makePayment(address,address)void' | 'makePayment', {
      argsObj: {
        sender: string
        acctRef: string
      }
      argsTuple: [sender: string, acctRef: string]
      returns: void
    }>
  /**
   * Defines the shape of the global and local state of the application.
   */
  state: {
    global: {
      lastPayment?: IntegerState
    }
  }
}
/**
 * Defines the possible abi call signatures
 */
export type SubscriptionPluginSig = keyof SubscriptionPlugin['methods']
/**
 * Defines an object containing all relevant parameters for a single call to the contract. Where TSignature is undefined, a bare call is made
 */
export type TypedCallParams<TSignature extends SubscriptionPluginSig | undefined> = {
  method: TSignature
  methodArgs: TSignature extends undefined ? undefined : Array<ABIAppCallArg | undefined>
} & AppClientCallCoreParams & CoreAppCallArgs
/**
 * Defines the arguments required for a bare call
 */
export type BareCallArgs = Omit<RawAppCallArgs, keyof CoreAppCallArgs>
/**
 * Maps a method signature from the SubscriptionPlugin smart contract to the method's arguments in either tuple of struct form
 */
export type MethodArgs<TSignature extends SubscriptionPluginSig> = SubscriptionPlugin['methods'][TSignature]['argsObj' | 'argsTuple']
/**
 * Maps a method signature from the SubscriptionPlugin smart contract to the method's return type
 */
export type MethodReturn<TSignature extends SubscriptionPluginSig> = SubscriptionPlugin['methods'][TSignature]['returns']

/**
 * A factory for available 'create' calls
 */
export type SubscriptionPluginCreateCalls = (typeof SubscriptionPluginCallFactory)['create']
/**
 * Defines supported create methods for this smart contract
 */
export type SubscriptionPluginCreateCallParams =
  | (TypedCallParams<undefined> & (OnCompleteNoOp))
  | (TypedCallParams<'createApplication()void'> & (OnCompleteNoOp))
/**
 * Defines arguments required for the deploy method.
 */
export type SubscriptionPluginDeployArgs = {
  deployTimeParams?: TealTemplateParams
  /**
   * A delegate which takes a create call factory and returns the create call params for this smart contract
   */
  createCall?: (callFactory: SubscriptionPluginCreateCalls) => SubscriptionPluginCreateCallParams
}


/**
 * Exposes methods for constructing all available smart contract calls
 */
export abstract class SubscriptionPluginCallFactory {
  /**
   * Gets available create call factories
   */
  static get create() {
    return {
      /**
       * Constructs a create call for the SubscriptionPlugin smart contract using a bare call
       *
       * @param params Any parameters for the call
       * @returns A TypedCallParams object for the call
       */
      bare(params: BareCallArgs & AppClientCallCoreParams & CoreAppCallArgs & AppClientCompilationParams & (OnCompleteNoOp) = {}) {
        return {
          method: undefined,
          methodArgs: undefined,
          ...params,
        }
      },
      /**
       * Constructs a create call for the SubscriptionPlugin smart contract using the createApplication()void ABI method
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
   * Constructs a no op call for the makePayment(address,address)void ABI method
   *
   * @param args Any args for the contract call
   * @param params Any additional parameters for the call
   * @returns A TypedCallParams object for the call
   */
  static makePayment(args: MethodArgs<'makePayment(address,address)void'>, params: AppClientCallCoreParams & CoreAppCallArgs) {
    return {
      method: 'makePayment(address,address)void' as const,
      methodArgs: Array.isArray(args) ? args : [args.sender, args.acctRef],
      ...params,
    }
  }
}

/**
 * A client to make calls to the SubscriptionPlugin smart contract
 */
export class SubscriptionPluginClient {
  /**
   * The underlying `ApplicationClient` for when you want to have more flexibility
   */
  public readonly appClient: ApplicationClient

  private readonly sender: SendTransactionFrom | undefined

  /**
   * Creates a new instance of `SubscriptionPluginClient`
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
  public async call<TSignature extends keyof SubscriptionPlugin['methods']>(typedCallParams: TypedCallParams<TSignature>, returnValueFormatter?: (value: any) => MethodReturn<TSignature>) {
    return this.mapReturnValue<MethodReturn<TSignature>>(await this.appClient.call(typedCallParams), returnValueFormatter)
  }

  /**
   * Idempotently deploys the SubscriptionPlugin smart contract.
   *
   * @param params The arguments for the contract calls and any additional parameters for the call
   * @returns The deployment result
   */
  public deploy(params: SubscriptionPluginDeployArgs & AppClientDeployCoreParams & IncludeSchema = {}): ReturnType<ApplicationClient['deploy']> {
    const createArgs = params.createCall?.(SubscriptionPluginCallFactory.create)
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
       * Creates a new instance of the SubscriptionPlugin smart contract using a bare call.
       *
       * @param args The arguments for the bare call
       * @returns The create result
       */
      async bare(args: BareCallArgs & AppClientCallCoreParams & AppClientCompilationParams & IncludeSchema & CoreAppCallArgs & (OnCompleteNoOp) = {}) {
        return $this.mapReturnValue<undefined, AppCreateCallTransactionResult>(await $this.appClient.create(args))
      },
      /**
       * Creates a new instance of the SubscriptionPlugin smart contract using the createApplication()void ABI method.
       *
       * @param args The arguments for the smart contract call
       * @param params Any additional parameters for the call
       * @returns The create result
       */
      async createApplication(args: MethodArgs<'createApplication()void'>, params: AppClientCallCoreParams & AppClientCompilationParams & IncludeSchema & CoreAppCallArgs & (OnCompleteNoOp) = {}) {
        return $this.mapReturnValue<MethodReturn<'createApplication()void'>, AppCreateCallTransactionResult>(await $this.appClient.create(SubscriptionPluginCallFactory.create.createApplication(args, params)))
      },
    }
  }

  /**
   * Makes a clear_state call to an existing instance of the SubscriptionPlugin smart contract.
   *
   * @param args The arguments for the bare call
   * @returns The clear_state result
   */
  public clearState(args: BareCallArgs & AppClientCallCoreParams & CoreAppCallArgs = {}) {
    return this.appClient.clearState(args)
  }

  /**
   * Calls the makePayment(address,address)void ABI method.
   *
   * @param args The arguments for the contract call
   * @param params Any additional parameters for the call
   * @returns The result of the call
   */
  public makePayment(args: MethodArgs<'makePayment(address,address)void'>, params: AppClientCallCoreParams & CoreAppCallArgs = {}) {
    return this.call(SubscriptionPluginCallFactory.makePayment(args, params))
  }

  /**
   * Extracts a binary state value out of an AppState dictionary
   *
   * @param state The state dictionary containing the state value
   * @param key The key of the state value
   * @returns A BinaryState instance containing the state value, or undefined if the key was not found
   */
  private static getBinaryState(state: AppState, key: string): BinaryState | undefined {
    const value = state[key]
    if (!value) return undefined
    if (!('valueRaw' in value))
      throw new Error(`Failed to parse state value for ${key}; received an int when expected a byte array`)
    return {
      asString(): string {
        return value.value
      },
      asByteArray(): Uint8Array {
        return value.valueRaw
      }
    }
  }

  /**
   * Extracts a integer state value out of an AppState dictionary
   *
   * @param state The state dictionary containing the state value
   * @param key The key of the state value
   * @returns An IntegerState instance containing the state value, or undefined if the key was not found
   */
  private static getIntegerState(state: AppState, key: string): IntegerState | undefined {
    const value = state[key]
    if (!value) return undefined
    if ('valueRaw' in value)
      throw new Error(`Failed to parse state value for ${key}; received a byte array when expected a number`)
    return {
      asBigInt() {
        return typeof value.value === 'bigint' ? value.value : BigInt(value.value)
      },
      asNumber(): number {
        return typeof value.value === 'bigint' ? Number(value.value) : value.value
      },
    }
  }

  /**
   * Returns the smart contract's global state wrapped in a strongly typed accessor with options to format the stored value
   */
  public async getGlobalState(): Promise<SubscriptionPlugin['state']['global']> {
    const state = await this.appClient.getGlobalState()
    return {
      get lastPayment() {
        return SubscriptionPluginClient.getIntegerState(state, 'lastPayment')
      },
    }
  }

  public compose(): SubscriptionPluginComposer {
    const client = this
    const atc = new AtomicTransactionComposer()
    let promiseChain:Promise<unknown> = Promise.resolve()
    const resultMappers: Array<undefined | ((x: any) => any)> = []
    return {
      makePayment(args: MethodArgs<'makePayment(address,address)void'>, params?: AppClientComposeCallCoreParams & CoreAppCallArgs) {
        promiseChain = promiseChain.then(() => client.makePayment(args, {...params, sendParams: {...params?.sendParams, skipSending: true, atc}}))
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
    } as unknown as SubscriptionPluginComposer
  }
}
export type SubscriptionPluginComposer<TReturns extends [...any[]] = []> = {
  /**
   * Calls the makePayment(address,address)void ABI method.
   *
   * @param args The arguments for the contract call
   * @param params Any additional parameters for the call
   * @returns The typed transaction composer so you can fluently chain multiple calls or call execute to execute all queued up transactions
   */
  makePayment(args: MethodArgs<'makePayment(address,address)void'>, params?: AppClientComposeCallCoreParams & CoreAppCallArgs): SubscriptionPluginComposer<[...TReturns, MethodReturn<'makePayment(address,address)void'>]>

  /**
   * Makes a clear_state call to an existing instance of the SubscriptionPlugin smart contract.
   *
   * @param args The arguments for the bare call
   * @returns The typed transaction composer so you can fluently chain multiple calls or call execute to execute all queued up transactions
   */
  clearState(args?: BareCallArgs & AppClientComposeCallCoreParams & CoreAppCallArgs): SubscriptionPluginComposer<[...TReturns, undefined]>

  /**
   * Adds a transaction to the composer
   *
   * @param txn One of: A TransactionWithSigner object (returned as is), a TransactionToSign object (signer is obtained from the signer property), a Transaction object (signer is extracted from the defaultSender parameter), an async SendTransactionResult returned by one of algokit utils helpers (signer is obtained from the defaultSender parameter)
   * @param defaultSender The default sender to be used to obtain a signer where the object provided to the transaction parameter does not include a signer.
   */
  addTransaction(txn: TransactionWithSigner | TransactionToSign | Transaction | Promise<SendTransactionResult>, defaultSender?: SendTransactionFrom): SubscriptionPluginComposer<TReturns>
  /**
   * Returns the underlying AtomicTransactionComposer instance
   */
  atc(): Promise<AtomicTransactionComposer>
  /**
   * Simulates the transaction group and returns the result
   */
  simulate(options?: SimulateOptions): Promise<SubscriptionPluginComposerSimulateResult<TReturns>>
  /**
   * Executes the transaction group and returns the results
   */
  execute(sendParams?: AppClientComposeExecuteParams): Promise<SubscriptionPluginComposerResults<TReturns>>
}
export type SimulateOptions = Omit<ConstructorParameters<typeof modelsv2.SimulateRequest>[0], 'txnGroups'>
export type SubscriptionPluginComposerSimulateResult<TReturns extends [...any[]]> = {
  returns: TReturns
  methodResults: ABIResult[]
  simulateResponse: modelsv2.SimulateResponse
}
export type SubscriptionPluginComposerResults<TReturns extends [...any[]]> = {
  returns: TReturns
  groupId: string
  txIds: string[]
  transactions: Transaction[]
}
