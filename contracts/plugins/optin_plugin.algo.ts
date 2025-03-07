import { Account, Application, Asset, Bytes, Contract, Global, arc4, assert, gtxn, op, itxn, abimethod } from "@algorandfoundation/algorand-typescript";

export class OptInPlugin extends Contract {

  @abimethod({ onCreate: 'require' })
  createApplication(): void {}

  optInToAsset(sender: arc4.UintN64, asset: arc4.UintN64, mbrPayment: gtxn.PaymentTxn): void {
    const [controlledAccountBytes] = op.AppGlobal.getExBytes(Application(sender.native), Bytes('c'));
    const controlledAccount = Account(Bytes(controlledAccountBytes));
    // verifyPayTxn(mbrPayment, {
    //   receiver: controlledAccount,
    //   amount: {
    //     greaterThanEqualTo: globals.assetOptInMinBalance,
    //   },
    // });
    assert(mbrPayment.amount >= Global.assetOptInMinBalance, 'asset mismatch');

    itxn
      .assetTransfer({
        sender: controlledAccount,
        assetReceiver: controlledAccount,
        assetAmount: 0,
        xferAsset: Asset(asset.native),
        rekeyTo: Application(sender.native).address,
        fee: 0,
      })
      .submit();
  }
}
