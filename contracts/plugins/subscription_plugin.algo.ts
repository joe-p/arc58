import { Contract, GlobalState, uint64, Global, arc4, assert, Account, Bytes, Application, op } from '@algorandfoundation/algorand-typescript';
import { payment } from '@algorandfoundation/algorand-typescript/itxn';

// These constants should be template variables, but I made them constants because I'm lazy

/** How frequent this payment can be made */
const FREQUENCY = 1;
/** Amount of the payment */
const AMOUNT = 100_000;

export class SubscriptionPlugin extends Contract {
  programVersion = 10;

  lastPayment = GlobalState<uint64>({ initialValue: 0 });

  constructor() {
    super();
  }

  makePayment(
    sender: arc4.UintN64,
    // eslint-disable-next-line no-unused-vars
    _acctRef: arc4.Address
  ): void {
    assert(Global.round - this.lastPayment.value > FREQUENCY);
    this.lastPayment.value = Global.round;

    const [controlledAccountBytes] = op.AppGlobal.getExBytes(Application(sender.native), Bytes('c'));
    
    // .globalState('c') as Address;

    payment({
      sender: Account(Bytes(controlledAccountBytes)),
      amount: AMOUNT,
      receiver: Account(Bytes.fromBase32('46XYR7OTRZXISI2TRSBDWPUVQT4ECBWNI7TFWPPS6EKAPJ7W5OBXSNG66M')),
      rekeyTo: Application(sender.native).address,
    });
  }
}
