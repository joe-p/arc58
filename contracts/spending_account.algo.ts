import { Application, assert, assertMatch, Contract, Global, GlobalState, gtxn, itxn, Txn, uint64 } from "@algorandfoundation/algorand-typescript"
import { ERR_ONLY_CREATOR_CAN_REKEY } from "./errors"
import { abimethod, Address } from "@algorandfoundation/algorand-typescript/arc4"

const ERR_ONLY_WALLET_OR_PLUGIN = 'Only the wallet or plugin can opt in'
const ERR_INVALID_PAYMENT = 'Invalid payment transaction'
const ERR_ONLY_FACTORY_CAN_DELETE = 'Only the factory can delete the application'

export class SpendingAccountContract extends Contract {

  walletID = GlobalState<uint64>({ key: 'wallet_id' })
  pluginID = GlobalState<uint64>({ key: 'plugin_id' })

  private isWallet() {
    return Txn.sender === Application(this.walletID.value).address
  }

  private isPlugin() {
    return Txn.sender === Application(this.pluginID.value).address
  }

  // @ts-ignore
  @abimethod({ onCreate: 'require' })
  createApplication(walletID: uint64, plugin: uint64): void {
    this.walletID.value = walletID
    this.pluginID.value = plugin
  }

  rekey(address: Address): void {
    assert(this.isWallet(), ERR_ONLY_CREATOR_CAN_REKEY)

    itxn
      .payment({
        amount: 0,
        rekeyTo: address.native,
        fee: 0,
      })
      .submit()
  }

  /**
   * optin tells the contract to opt into an asa
   * @param payment The payment transaction
   * @param asset The asset to be opted into
   */
  optin(payment: gtxn.PaymentTxn, asset: uint64): void {
    assert(this.isWallet() || this.isPlugin(), ERR_ONLY_WALLET_OR_PLUGIN)

    assertMatch(
      payment,
      {
        receiver: Global.currentApplicationAddress,
        amount: Global.assetOptInMinBalance,
      },
      ERR_INVALID_PAYMENT
    )

    itxn
      .assetTransfer({
        assetReceiver: Global.currentApplicationAddress,
        assetAmount: 0,
        xferAsset: asset,
        fee: 0,
      })
      .submit()
  }

  // @ts-ignore
  @abimethod({ allowActions: ['DeleteApplication'] })
  deleteApplication(): void {
    assert(Txn.sender === Global.creatorAddress, ERR_ONLY_FACTORY_CAN_DELETE)
  }
}