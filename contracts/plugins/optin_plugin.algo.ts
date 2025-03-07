import { Account, Application, Asset, Bytes, Contract, Global, arc4, assert, gtxn, op } from "@algorandfoundation/algorand-typescript";
import { assetTransfer } from "@algorandfoundation/algorand-typescript/itxn";


export class OptInPlugin extends Contract {
  programVersion = 10;

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

    assetTransfer({
      sender: controlledAccount,
      assetReceiver: controlledAccount,
      assetAmount: 0,
      xferAsset: Asset(asset.native),
      rekeyTo: Application(sender.native).address,
    });
  }
}
