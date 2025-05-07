import { Application, Asset, Global, gtxn, itxn, abimethod, assertMatch, uint64 } from "@algorandfoundation/algorand-typescript";
import { Plugin } from "./plugin";
import { ERR_INVALID_PAYMENT } from "../errors";

export class OptInPlugin extends Plugin {

  // @ts-ignore
  @abimethod({ onCreate: 'require' })
  createApplication(): void {}

  optInToAsset(walletID: uint64, rekeyBack: boolean, asset: uint64, mbrPayment: gtxn.PaymentTxn): void {
    const wallet = Application(walletID)
    const sender = this.getSpendingAccount(wallet)

    assertMatch(
      mbrPayment,
      {
        receiver: sender,
        amount: Global.assetOptInMinBalance
      },
      ERR_INVALID_PAYMENT
    )

    itxn
      .assetTransfer({
        sender,
        assetReceiver: sender,
        assetAmount: 0,
        xferAsset: Asset(asset),
        rekeyTo: this.rekeyAddress(rekeyBack, wallet),
        fee: 0,
      })
      .submit();
  }
}
