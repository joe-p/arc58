import { Contract } from '@algorandfoundation/tealscript';

/**
 * GateParams is a tuple of the parameters that are stored for each plugin,
 * they dictate the accessibility of the plugin on the network and the duration
 * of the plugin's access for a given address
 */
export interface GateParams {
  addedAt: uint64;
  duration: uint64;
}

export class AbstractedAccount extends Contract {
  /** Target AVM 10 */
  programVersion = 10;

  /** The admin of the abstracted account */
  admin = GlobalStateKey<Address>();

  /**
   * The apps that are authorized to send itxns from the abstracted account
   * The box map values aren't actually used and are always empty
   */
  plugins = BoxMap<Application, StaticArray<byte, 0>>({ prefix: 'p' });

  /**
   * Plugins that have been given a name for discoverability
   */
  namedPlugins = BoxMap<bytes, Application>({ prefix: 'n' });

  /**
   * Gates the ability to use plugins via a time lock
   * & box key `appID` + `address
   * GateParams is a tuple that contains the 
   * duration of the gate and the time it was added
   */
  gates = BoxMap<bytes, GateParams>({ prefix: 'g' });


  /** The address of the abstracted account */
  address = GlobalStateKey<Address>();

  /**
   * Ensure that by the end of the group the abstracted account has control of its address
   */
  private verifyRekeyToAbstractedAccount(): void {
    const lastTxn = this.txnGroup[this.txnGroup.length - 1];

    // If the last txn isn't a rekey, then assert that the last txn is a call to verifyAuthAddr
    if (lastTxn.sender !== this.address.value || lastTxn.rekeyTo !== this.getAuthAddr()) {
      verifyAppCallTxn(lastTxn, {
        applicationID: this.app,
        applicationArgs: {
          0: method('verifyAuthAddr()void'),
        },
      });
    }
  }

  /**
   * What the value of this.address.value.authAddr should be when this.address
   * is able to be controlled by this app. It will either be this.app.address or zeroAddress
   */
  private getAuthAddr(): Address {
    return this.address.value === this.app.address ? Address.zeroAddress : this.app.address;
  }

  /**
   * Create an abstracted account application
   *
   * @param address The address of the abstracted account. If zeroAddress, then the address of the contract account will be used
   * @param admin The admin for this app
   */
  createApplication(address: Address, admin: Address): void {
    verifyAppCallTxn(this.txn, {
      sender: { includedIn: [address, admin] },
    });

    assert(admin !== address);

    this.admin.value = admin;
    this.address.value = address === Address.zeroAddress ? this.app.address : address;
  }

  /**
   * Verify the abstracted account is rekeyed to this app
   */
  verifyAuthAddr(): void {
    assert(this.address.value.authAddr === this.getAuthAddr());
  }

  /**
   * Rekey the abstracted account to another address. Primarily useful for rekeying to an EOA.
   *
   * @param addr The address to rekey to
   * @param flash Whether or not this should be a flash rekey. If true, the rekey back to the app address must done in the same txn group as this call
   */
  rekeyTo(addr: Address, flash: boolean): void {
    verifyAppCallTxn(this.txn, { sender: this.admin.value });

    sendPayment({
      sender: this.address.value,
      receiver: addr,
      rekeyTo: addr,
      note: 'rekeying abstracted account',
    });

    if (flash) this.verifyRekeyToAbstractedAccount();
  }

  /**
   * Temporarily rekey to an approved plugin app address
   *
   * @param plugin The app to rekey to
   */
  rekeyToPlugin(plugin: Application): void {
    // key existing indicates this plugin is approved for all addresses
    const globalGateKey = itob(plugin) + globals.zeroAddress;
    // key existing indicates this plugin may be valid to use for this address
    const senderGateKey = itob(plugin) + this.txn.sender;

    assert(
      this.plugins(plugin).exists,
      (this.gates(globalGateKey).exists || this.gates(senderGateKey).exists),
    );

    // check our sender is still authorized to call this plugin for the user
    if (!this.gates(globalGateKey).exists && this.gates(senderGateKey).exists) {
      const gate = this.gates(senderGateKey).value;
      assert(gate.addedAt + gate.duration > globals.latestTimestamp);
    }

    sendPayment({
      sender: this.address.value,
      receiver: this.address.value,
      rekeyTo: plugin.address,
      note: 'rekeying to plugin app',
    });

    this.verifyRekeyToAbstractedAccount();
  }

  /**
   * Temporarily rekey to a named plugin app address
   *
   * @param name The name of the plugin to rekey to
   */
  rekeyToNamedPlugin(name: string): void {
    this.rekeyToPlugin(this.namedPlugins(name).value);
  }

  /**
   * Change the admin for this app
   *
   * @param newAdmin The new admin
   */
  changeAdmin(newAdmin: Account): void {
    verifyTxn(this.txn, { sender: this.admin.value });
    this.admin.value = newAdmin;
  }

  /**
   * Add an app to the list of approved plugins
   *
   * @param app The app to add
   * @param global Whether or not this plugin should be approved for all addresses
   */
  addPlugin(app: Application, global: boolean): void {
    verifyTxn(this.txn, { sender: this.admin.value });

    this.plugins(app).create(0);
    
    if (global) {
      const key = itob(app) + globals.zeroAddress;
      this.gates(key).value = { addedAt: globals.latestTimestamp, duration: 0 };
    }
  }

  /**
   * Remove an app from the list of approved plugins
   *
   * @param app The app to remove
   */
  removePlugin(app: Application): void {
    verifyTxn(this.txn, { sender: this.admin.value });

    this.plugins(app).delete();
  }

  /**
   * Add a named plugin
   *
   * @param app The plugin app
   * @param name The plugin name
   */
  addNamedPlugin(app: Application, name: string): void {
    verifyTxn(this.txn, { sender: this.admin.value });

    assert(!this.namedPlugins(name).exists);
    this.namedPlugins(name).value = app;
    this.plugins(app).create(0);
  }

  /**
   * Remove a named plugin
   *
   * @param name The plugin name
   */
  removeNamedPlugin(name: string): void {
    verifyTxn(this.txn, { sender: this.admin.value });

    const app = this.namedPlugins(name).value;
    this.namedPlugins(name).delete();
    this.plugins(app).delete();
  }

  /**
   * Add a gate for an app, it can also be used for renewals
   *
   * @param app The app to add the gate for
   * @param address The duration of the gate
   * @param duration The duration of the gate
   */

  addGate(app: Application, address: string, duration: uint64): void {
    verifyTxn(this.txn, { sender: this.admin.value });

    const key = itob(app) + address;
    this.gates(key).value = { addedAt: globals.latestTimestamp, duration };
  }

  /**
   * Remove a gate for an app
   *
   * @param app The app to remove the gate for
   */
  removeGate(app: Application): void {
    verifyTxn(this.txn, { sender: this.admin.value });

    const key = itob(app) + globals.zeroAddress;
    this.gates(key).delete();
  }
}
