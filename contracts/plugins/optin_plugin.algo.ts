import { Account, Application, Asset, Bytes, Contract, Global, arc4, assert, gtxn, op, itxn, abimethod } from "@algorandfoundation/algorand-typescript";

export class OptInPlugin extends Contract {

  @abimethod({ onCreate: 'require' })
  createApplication(): void {}

  optInToAsset(sender: arc4.UintN64, rekeyBack: arc4.Bool, asset: arc4.UintN64, mbrPayment: gtxn.PaymentTxn): void {
    const [controlledAccountBytes] = op.AppGlobal.getExBytes(sender.native, Bytes('controlled_address'));
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
        rekeyTo: rekeyBack.native ? Application(sender.native).address : Global.zeroAddress,
        fee: 0,
      })
      .submit();
  }
}
