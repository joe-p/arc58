import { Contract, GlobalState, uint64, Global, arc4, assert, Account, Bytes, Application, op, itxn, abimethod } from '@algorandfoundation/algorand-typescript';

// These constants should be template variables, but I made them constants because I'm lazy

/** How frequent this payment can be made */
const FREQUENCY: uint64 = 1;
/** Amount of the payment */
const AMOUNT: uint64 = 100_000;

export class SubscriptionPlugin extends Contract {

  lastPayment = GlobalState<uint64>({ initialValue: 0 });

  @abimethod({ onCreate: 'require' })
  createApplication(): void {}

  makePayment(
    sender: arc4.UintN64,
    // eslint-disable-next-line no-unused-vars
    _acctRef: arc4.Address
  ): void {
    assert(Global.round - this.lastPayment.value > FREQUENCY);
    this.lastPayment.value = Global.round;

    const [controlledAccountBytes] = op.AppGlobal.getExBytes(sender.native, Bytes('controlled_address'));
    
    itxn
      .payment({
        sender: Account(controlledAccountBytes),
        amount: AMOUNT,
        receiver: Account(Bytes.fromBase32("46XYR7OTRZXISI2TRSBDWPUVQT4ECBWNI7TFWPPS6EKAPJ7W5OBXSNG66M").slice(0, 32)),
        // receiver: Global.zeroAddress,
        rekeyTo: Application(sender.native).address,
        fee: 0,
      })
      .submit();
  }
}
