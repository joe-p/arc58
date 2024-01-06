import { Contract } from '@algorandfoundation/tealscript';

type bytes32 = StaticArray<byte, 32>;

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

  programs = BoxMap<bytes32, Application>();

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
   * Add a program to this abstracted account
   *
   * @param program The program to add
   * @param globalNumUint The number of global uints this program requires
   * @param globalNumByteSlice The number of global byte slices this program requires
   * @param localNumByteSlice The number of local byte slices this program requires
   * @param localNumUint The number of local uints this program requires
   *
   */
  addProgram(
    program: bytes,
    globalNumUint: number,
    globalNumByteSlice: number,
    localNumByteSlice: number,
    localNumUint: number
  ): void {
    assert(this.txn.sender === this.eoa.value);

    sendAppCall({
      approvalProgram: program,
      clearStateProgram: this.app.clearStateProgram,
      globalNumByteSlice: globalNumByteSlice,
      globalNumUint: globalNumUint,
      localNumByteSlice: localNumByteSlice,
      localNumUint: localNumUint,
    });

    this.programs(sha256(program)).value = this.itxn.createdApplicationID;
  }

  /**
   * Remove a program from this abstracted account
   *
   * @param programHash The hash of the program to remove
   */
  removeProgram(programHash: bytes32): void {
    assert(this.txn.sender === this.eoa.value);

    this.programs(programHash).delete();
  }

  /**
   * Calls one of the deploy programs for this abstracted account
   *
   * TODO: Think of good way to pass args
   *
   * @param programHash The hash of the program to call
   * @param method The method selector to call
   *
   */
  callProgram(_appID: Application, programHash: bytes32, method: bytes): void {
    const app = this.programs(programHash).value;

    sendAppCall({
      applicationID: app,
      rekeyTo: app.address,
      applicationArgs: [method],
    });
  }
}
