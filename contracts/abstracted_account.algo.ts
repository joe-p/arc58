import { Contract } from '@algorandfoundation/tealscript';

export class AbstractedAccount extends Contract {
  programVersion = 10;

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
   * The apps that are authorized to send itxns from this account
   * The box map values aren't actually used and are always empty
   */
  apps = BoxMap<Application, StaticArray<byte, 0>>();

  /**
   * Create an abstracted account for an EOA
   */
  createApplication(): void {
    this.eoa.value = this.txn.sender;
    this.eoaAuthAddr.value =
      this.txn.sender.authAddr === Address.zeroAddress ? this.txn.sender : this.txn.sender.authAddr;
  }

  /**
   * Save the auth addr of the EOA in state so we can rekey back to it later
   */
  saveAuthAddr(): void {
    this.eoaAuthAddr.value = this.eoa.value.authAddr === Address.zeroAddress ? this.eoa.value : this.eoa.value.authAddr;
  }

  /**
   * Verify the contract account is not rekeyed
   */
  verifyAppAuthAddr(): void {
    assert(this.app.address.authAddr === globals.zeroAddress);
  }

  /**
   * Make sure that verifyAppAuthAddr is called by the end of the txn group
   */
  private assertVerifyAppAuthAddrIsCalled(): void {
    // Verify that by the end of the txn group, the rekey back to this app account is done
    const appl = this.txnGroup[this.txnGroup.length - 1];
    verifyAppCallTxn(appl, {
      applicationID: this.app,
    });
    assert(appl.applicationArgs[0] === method('verifyAppAuthAddr()void'));
  }

  /**
   * Rekey this contract account to the EOA
   *
   * @param saveAuthAddrCall Call to saveAuthAddr() to ensure the EOA's auth addr is saved in state
   * @param flash Whether or not this should be a flash rekey. If true, the rekey back to this contract must done in the same txn group as this call
   */
  rekeyToEOA(saveAuthAddrCall: AppCallTxn, flash: boolean): void {
    verifyAppCallTxn(saveAuthAddrCall, { applicationID: this.app });
    assert(saveAuthAddrCall.applicationArgs[0] === method('saveAuthAddr()void'));

    sendPayment({
      receiver: this.eoa.value,
      rekeyTo: this.eoaAuthAddr.value,
      note: 'rekeying to EOA',
    });

    if (flash || this.forceFlash.value) {
      this.assertVerifyAppAuthAddrIsCalled();
    }
  }

  /**
   * Temporarily rekey to an approved app
   *
   * @param app The app to rekey to
   */
  rekeyToApp(app: Application): void {
    assert(this.apps(app).exists);

    sendPayment({
      receiver: this.eoa.value,
      rekeyTo: app.address,
      note: 'rekeying to app',
    });

    this.assertVerifyAppAuthAddrIsCalled();
  }

  /**
   * Add an app to the list of approved apps
   *
   * @param app The app to add
   */
  addApp(app: Application): void {
    assert(this.txn.sender === this.eoa.value);

    this.apps(app).create(0);
  }

  /**
   * Remove an app from the list of approved apps
   *
   * @param app The app to remove
   */
  removeApp(app: Application): void {
    assert(this.txn.sender === this.eoa.value);

    this.apps(app).delete();
  }
}
