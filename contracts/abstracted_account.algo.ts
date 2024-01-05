import { Contract } from '@algorandfoundation/tealscript';

export class AbstractedAccount extends Contract {
  /** The EOA (Externally Owned Account) */
  eoa = GlobalStateKey<Address>();

  /** The EOA's auth addr, if it has one */
  eoaAuthAddr = GlobalStateKey<Address>();

  /**
   * Whether or not this abstracted account must always use a "flash" rekey
   * A "flash" rekey ensures that the rekey back is done atomically in the same group
   */
  forceFlash = GlobalStateKey<boolean>();

  /**
   * Create an abstracted account for an EOA
   *
   * @param eoa The EOA to create the abstracted account for
   */
  createApplication(eoa: Address): void {
    this.eoa.value = eoa;
    this.eoaAuthAddr.value = eoa.authAddr === Address.zeroAddress ? eoa : eoa.authAddr;
  }

  /**
   * Save the auth addr of the EOA in state so we can rekey back to it later
   */
  saveAuthAddr(): void {
    this.eoaAuthAddr.value = this.eoa.value.authAddr === Address.zeroAddress ? this.eoa.value : this.eoa.value.authAddr;
  }

  /**
   * Rekey this contract account to the EOA
   *
   * @param saveAuthAddrCall Call to saveAuthAddr() to ensure the EOA's auth addr is saved in state
   * @param flash Whether or not this should be a flash rekey. If true, the rekey back to this contract must done in the same txn as the call to saveAuthAddr()
   */
  rekey(saveAuthAddrCall: AppCallTxn, flash: boolean): void {
    verifyAppCallTxn(saveAuthAddrCall, { applicationID: this.app });
    assert(saveAuthAddrCall.applicationArgs[0] === method('saveAuthAddr()void'));

    sendPayment({
      receiver: this.eoa.value,
      rekeyTo: this.eoaAuthAddr.value,
      note: 'rekeying to EOA',
    });

    if (flash || this.forceFlash.value) {
      verifyTxn(this.txnGroup[this.txnGroup.length - 1], {
        sender: this.app.address,
        rekeyTo: this.app.address,
      });
    }
  }

  /**
   * Update the application, presumably to add more functionality to the abstracted account
   * WARNING: A bad update can irreversibly break the abstracted account and any funds inside of it
   */
  updateApplication(): void {
    verifyAppCallTxn(this.txn, { sender: this.eoa.value });
  }
}
