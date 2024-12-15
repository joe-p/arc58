import { Contract } from '@algorandfoundation/tealscript';

type PluginsKey = {
  /** The application containing plugin logic */
  application: AppID;
  /** The address that is allowed to initiate a rekey to the plugin */
  allowedCaller: Address;
};

type PluginInfo = {
  /** The last round at which this plugin can be called */
  lastValidRound: uint64;
  /** The number of rounds that must pass before the plugin can be called again */
  cooldown: uint64;
  /** The last round the plugin was called */
  lastCalled: uint64;
  /** The number of methods on the plugin, zero indicates no restrictions */
  methodRestrictions: uint64;
  /** Whether the plugin has permissions to change the admin account */
  adminPrivileges: boolean;
};

type MethodsKey = {
  /** The application containing plugin logic */
  application: AppID;
  /** The address that is allowed to initiate a rekey to the plugin */
  allowedCaller: Address;
  /** The 4 byte method signature */
  method: bytes<4>;
}

export class AbstractedAccount extends Contract {
  /** Target AVM 10 */
  programVersion = 10;

  /** The admin of the abstracted account. This address can add plugins and initiate rekeys */
  admin = GlobalStateKey<Address>({ key: 'a' });

  /**
   * Plugins that add functionality to the contract wallet and the account that has permission to use it.
   */
  plugins = BoxMap<PluginsKey, PluginInfo>({ prefix: 'p' });

  /**
   * methods restrict plugin delegation only to the method names allowed for the delegation
   * a methods box entry missing means that all methods on the plugin are allowed
   */
  methods = BoxMap<MethodsKey, bytes<0>>({ prefix: 'm' });

  /**
   * Plugins that have been given a name for discoverability
   */
  namedPlugins = BoxMap<bytes, PluginsKey>({ prefix: 'n' });

  private assertPluginCallAllowed(app: AppID, caller: Address): void {
    const key: PluginsKey = { application: app, allowedCaller: caller };

    assert(this.plugins(key).exists, 'plugin does not exist');
    assert(this.plugins(key).value.lastValidRound >= globals.round, 'plugin is expired');
    assert(
      globals.round - this.plugins(key).value.lastCalled >= this.plugins(key).value.cooldown,
      'plugin is on cooldown'
    );
  }

  private pluginCallAllowed(app: AppID, caller: Address): boolean {
    const key: PluginsKey = { application: app, allowedCaller: caller };

    return (
      this.plugins(key).exists &&
      this.plugins(key).value.lastValidRound >= globals.round &&
      globals.round - this.plugins(key).value.lastCalled >= this.plugins(key).value.cooldown
    );
  }

  private ensuresRekeyBack(txn: Txn): boolean {
    if (txn.sender === this.app.address && txn.rekeyTo === this.app.address) {
      return true;
    }

    return (
      txn.typeEnum === TransactionType.ApplicationCall &&
      txn.applicationID === this.app &&
      txn.numAppArgs === 1 &&
      txn.onCompletion === 0 &&
      txn.applicationArgs[0] === method('arc58_verifyAuthAddr()void')
    )
  }

  private assertRekeysBack(): void {
    let rekeysBack = false;
    for (let i = (this.txn.groupIndex + 1); i < this.txnGroup.length; i += 1) {
      const txn = this.txnGroup[i];

      if (this.ensuresRekeyBack(txn)) {
        rekeysBack = true;
      }
    }

    assert(rekeysBack, 'rekey back not found');
  }

  /**
 * Guarantee that our txn group is valid in a single loop over all txns in the group
 * 
 * @param app the plugin app id being validated
 * @param caller the address that triggered the plugin or global address
 * @returns whether the txn group rekeys back and uses only allowed methods
 */
  private assertValidGroup(app: AppID, checkGlobal: boolean, checkLocal: boolean): void {
    const gkey: PluginsKey = { application: app, allowedCaller: Address.zeroAddress };
    const key: PluginsKey = { application: app, allowedCaller: this.txn.sender };

    let rekeysBack = false;
    let gRestrictions = checkGlobal && this.plugins(gkey).value.methodRestrictions > 0;
    let lrestrictions = checkLocal && this.plugins(key).value.methodRestrictions > 0;

    for (let i = (this.txn.groupIndex + 1); i < this.txnGroup.length; i += 1) {
      const txn = this.txnGroup[i];

      if (this.ensuresRekeyBack(txn)) {
        rekeysBack = true;
      }

      const gAllowed = !gRestrictions || this.methodCallAllowed(txn, app, Address.zeroAddress);
      const gValid = checkGlobal && gAllowed;
      const lAllowed = !lrestrictions || this.methodCallAllowed(txn, app, this.txn.sender);
      const lValid = checkLocal && lAllowed;

      assert(gValid || lValid, 'method not allowed');
    }

    assert(rekeysBack, 'no rekey back found');
  }

  /**
   * Checks if the method call is allowed
   * 
   * @param txn the transaction being validated
   * @param app the plugin app id being validated
   * @param caller the address that triggered the plugin or global address
   * @returns whether the method call is allowed
   */
  private methodCallAllowed(txn: Txn, app: AppID, caller: Address): boolean {
    if (
      // ignore non-application calls
      txn.typeEnum !== TransactionType.ApplicationCall ||
      // ignore calls to other applications
      (txn.applicationID !== app && txn.applicationID !== this.app) ||
      // if its globally allowed, ignore the caller
      // otherwise ignore calls from other addresses
      (caller !== Address.zeroAddress && txn.sender !== caller) ||
      // ignore rekey back assert app call
      this.ensuresRekeyBack(txn)
    ) {
      return true;
    }

    assert(txn.numAppArgs > 0, 'no method signature provided');
    assert(len(txn.applicationArgs[0]) === 4, 'invalid method signature length');

    const key: MethodsKey = {
      application: app,
      allowedCaller: caller,
      method: txn.applicationArgs[0] as bytes<4>
    };

    if (!this.methods(key).exists) {
      return false;
    }

    return true;
  }

  /**
   * Create an abstracted account application.
   * This is not part of ARC58 and implementation specific.
   *
   * @param admin The admin for this app
   */
  createApplication(admin: Address): void {
    verifyAppCallTxn(this.txn, {
      sender: admin,
    });

    this.admin.value = admin;
  }

  /**
   * Attempt to change the admin for this app. Some implementations MAY not support this.
   *
   * @param newAdmin The new admin
   */
  arc58_changeAdmin(newAdmin: Address): void {
    verifyTxn(this.txn, { sender: this.admin.value });
    this.admin.value = newAdmin;
  }

  /**
   * Attempt to change the admin via plugin.
   *
   * @param plugin The app calling the plugin
   * @param allowedCaller The address that triggered the plugin
   * @param newAdmin The new admin
   *
   */
  arc58_pluginChangeAdmin(plugin: AppID, allowedCaller: Address, newAdmin: Address): void {
    verifyTxn(this.txn, { sender: plugin.address });
    assert(this.app.address.authAddr === plugin.address, 'This plugin is not in control of the account');

    const key: PluginsKey = { application: plugin, allowedCaller: allowedCaller };
    assert(
      this.plugins(key).exists && this.plugins(key).value.adminPrivileges,
      'This plugin does not have admin privileges'
    );

    this.admin.value = newAdmin;
  }

  /**
   * Get the admin of this app. This method SHOULD always be used rather than reading directly from state
   * because different implementations may have different ways of determining the admin.
   */
  @abi.readonly
  arc58_getAdmin(): Address {
    return this.admin.value;
  }

  /**
   * Verify the abstracted account is rekeyed to this app
   */
  arc58_verifyAuthAddr(): void {
    assert(this.app.address.authAddr === globals.zeroAddress);
  }

  /**
   * Rekey the abstracted account to another address. Primarily useful for rekeying to an EOA.
   *
   * @param addr The address to rekey to
   * @param flash Whether or not this should be a flash rekey. If true, the rekey back to the app address must done in the same txn group as this call
   */
  arc58_rekeyTo(addr: Address, flash: boolean): void {
    verifyAppCallTxn(this.txn, { sender: this.admin.value });

    sendPayment({
      receiver: addr,
      rekeyTo: addr,
      note: 'rekeying abstracted account',
    });

    if (flash) this.assertRekeysBack();
  }

  /**
   * check whether the plugin can be used
   *
   * @param plugin the plugin to be rekeyed to
   * @returns whether the plugin can be called via txn sender or globally
   */
  @abi.readonly
  arc58_canCall(plugin: AppID, address: Address): boolean {
    const globalAllowed = this.pluginCallAllowed(plugin, Address.zeroAddress);
    if (globalAllowed) return true;

    return this.pluginCallAllowed(plugin, address);
  }

  /**
   * Temporarily rekey to an approved plugin app address
   *
   * @param plugin The app to rekey to
   */
  arc58_rekeyToPlugin(plugin: AppID): void {
    const globalExists = this.plugins({ application: plugin, allowedCaller: Address.zeroAddress }).exists;
    const localExists = this.plugins({ application: plugin, allowedCaller: this.txn.sender }).exists;
  
    let globalAllowed = false;
    let locallyAllowed = false;

    if (globalExists) {
      globalAllowed = this.pluginCallAllowed(plugin, Address.zeroAddress);
    }

    if (localExists) {
      locallyAllowed = this.pluginCallAllowed(plugin, this.txn.sender);
    }

    // if the plugin does not exist or is not allowed by either the global or local caller
    // then the call is not allowed, assert check so we error out cleanly
    if (
      (!globalExists && !localExists)
      || (globalExists && !globalAllowed && !locallyAllowed)
    ) {
      this.assertPluginCallAllowed(plugin, Address.zeroAddress);
    } else if (localExists && !locallyAllowed && !globalAllowed) {
      this.assertPluginCallAllowed(plugin, this.txn.sender);
    }

    this.assertValidGroup(plugin, globalAllowed, locallyAllowed);

    sendPayment({
      receiver: this.app.address,
      rekeyTo: plugin.address,
      note: 'rekeying to plugin app',
    });

    this.plugins({
      application: plugin,
      allowedCaller: globalAllowed ? Address.zeroAddress : this.txn.sender,
    }).value.lastCalled = globals.round;
  }

  /**
   * Temporarily rekey to a named plugin app address
   *
   * @param name The name of the plugin to rekey to
   */
  arc58_rekeyToNamedPlugin(name: string): void {
    this.arc58_rekeyToPlugin(this.namedPlugins(name).value.application);
  }

  /**
   * Add an app to the list of approved plugins
   *
   * @param app The app to add
   * @param allowedCaller The address of that's allowed to call the app
   * or the global zero address for all addresses
   * @param lastValidRound The round when the permission expires
   * @param cooldown  The number of rounds that must pass before the plugin can be called again
   * @param adminPrivileges Whether the plugin has permissions to change the admin account
   */
  arc58_addPlugin(
    app: AppID,
    allowedCaller: Address,
    lastValidRound: uint64,
    cooldown: uint64,
    adminPrivileges: boolean,
    methods: bytes<4>[],
  ): void {
    verifyTxn(this.txn, { sender: this.admin.value });
    const key: PluginsKey = { application: app, allowedCaller: allowedCaller };

    this.plugins(key).value = {
      lastValidRound: lastValidRound,
      cooldown: cooldown,
      lastCalled: 0,
      methodRestrictions: methods.length,
      adminPrivileges: adminPrivileges,
    };

    for (let i = 0; i < methods.length; i += 1) {
      this.methods({ application: app, allowedCaller: allowedCaller, method: methods[i] }).create();
    }
  }

  /**
   * Remove an app from the list of approved plugins
   *
   * @param app The app to remove
   * @param allowedCaller The address of that's allowed to call the app
   * @param methods The methods that to remove before attempting to uninstall the plugin
   * or the global zero address for all addresses
   */
  arc58_removePlugin(app: AppID, allowedCaller: Address, methods: bytes<4>[]): void {
    verifyTxn(this.txn, { sender: this.admin.value });

    const key: PluginsKey = { application: app, allowedCaller: allowedCaller };

    assert(this.plugins(key).exists, 'plugin does not exist');

    let methodRestrictionCount = this.plugins(key).value.methodRestrictions;
    for (let i = 0; i < methods.length; i += 1) {
      const methodKey: MethodsKey = { application: app, allowedCaller: allowedCaller, method: methods[i] };
      assert(this.methods(methodKey).exists, 'method does not exist');
      methodRestrictionCount -= 1;
      this.methods(methodKey).delete();
    }

    assert(methodRestrictionCount === 0, 'plugin has method restrictions');

    this.plugins(key).delete();
  }

  /**
   * Add a named plugin
   *
   * @param app The plugin app
   * @param name The plugin name
   * @param allowedCaller The address of that's allowed to call the app
   * or the global zero address for all addresses
   * @param lastValidRound The round when the permission expires
   * @param cooldown  The number of rounds that must pass before the plugin can be called again
   * @param adminPrivileges Whether the plugin has permissions to change the admin account
   * @param methods The methods that are allowed to be called on the plugin
   */
  arc58_addNamedPlugin(
    name: string,
    app: AppID,
    allowedCaller: Address,
    lastValidRound: uint64,
    cooldown: uint64,
    adminPrivileges: boolean,
    methods: bytes<4>[],
  ): void {
    verifyTxn(this.txn, { sender: this.admin.value });
    assert(!this.namedPlugins(name).exists);

    const key: PluginsKey = { application: app, allowedCaller: allowedCaller };
    this.namedPlugins(name).value = key;

    const pluginInfo: PluginInfo = {
      lastValidRound: lastValidRound,
      cooldown: cooldown,
      lastCalled: 0,
      methodRestrictions: methods.length,
      adminPrivileges: adminPrivileges,
    };

    this.plugins(key).value = pluginInfo;

    for (let i = 0; i < methods.length; i += 1) {
      this.methods({ application: app, allowedCaller: allowedCaller, method: methods[i] }).create();
    }
  }

  /**
   * Remove a named plugin
   *
   * @param name The plugin name
   */
  arc58_removeNamedPlugin(name: string): void {
    verifyTxn(this.txn, { sender: this.admin.value });

    assert(this.namedPlugins(name).exists, 'plugin does not exist');
    const app = this.namedPlugins(name).value;
    assert(this.plugins(app).exists, 'plugin does not exist');
    assert(this.plugins(app).value.methodRestrictions === 0, 'plugin has method restrictions');

    this.namedPlugins(name).delete();
    this.plugins(app).delete();
  }

  arc58_addMethod(app: AppID, allowedCaller: Address, method: bytes<4>): void {
    verifyTxn(this.txn, { sender: this.admin.value });

    const pluginKey: PluginsKey = { application: app, allowedCaller: allowedCaller };
    const methodKey: MethodsKey = { application: app, allowedCaller: allowedCaller, method: method };

    assert(this.plugins(pluginKey).exists, 'plugin does not exist');
    assert(!this.methods(methodKey).exists, 'method already exists');

    this.plugins(pluginKey).value.methodRestrictions += 1;
    this.methods({ application: app, allowedCaller: allowedCaller, method: method }).create();
  }

  arc58_removeMethod(app: AppID, allowedCaller: Address, method: bytes<4>): void {
    verifyTxn(this.txn, { sender: this.admin.value });

    const pluginKey: PluginsKey = { application: app, allowedCaller: allowedCaller };
    const methodKey: MethodsKey = { application: app, allowedCaller: allowedCaller, method: method };

    assert(this.plugins(pluginKey).exists, 'plugin does not exist');
    assert(this.methods(methodKey).exists, 'method does not exist');

    this.plugins(pluginKey).value.methodRestrictions -= 1;
    this.methods(methodKey).delete();
  }
}
