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
  /** Whether the plugin has permissions to change the admin account */
  adminPrivileges: boolean;
  /** The methods that are allowed to be called for the plugin by the address */
  methods: bytes<4>[];
};

type CallerUsed = {
  global: boolean;
  local: boolean;
};

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
   * @param checkGlobal whether to check the global caller for method restrictions
   * @param checkLocal whether to check the local caller for method restrictions
   */
  private assertValidGroup(app: AppID, methodOffsets: uint64[], checkGlobal: boolean, checkLocal: boolean): CallerUsed {
    const gkey: PluginsKey = { application: app, allowedCaller: Address.zeroAddress };
    const key: PluginsKey = { application: app, allowedCaller: this.txn.sender };

    let rekeysBack = false;

    const globalRestrictions = checkGlobal && this.plugins(gkey).size > 29;
    const localRestrictions = checkLocal && this.plugins(key).size > 29;
    let methodIndex = 0;
    let callerUsed: CallerUsed = {
      global: checkGlobal && !globalRestrictions,
      local: checkLocal && !localRestrictions,
    };

    for (let i = (this.txn.groupIndex + 1); i < this.txnGroup.length; i += 1) {
      const txn = this.txnGroup[i];

      if (this.ensuresRekeyBack(txn)) {
        rekeysBack = true;
      }

      // we dont need to check method restrictions at all if none exist
      // & skip transactions that aren't relevant
      if ((!globalRestrictions && !localRestrictions) || this.shouldSkipMethodCheck(txn, app)) {
        continue;
      }

      const globalValid = (
        checkGlobal && (
          !globalRestrictions
          || (
            methodIndex < methodOffsets.length
            && this.methodCallAllowed(txn, app, Address.zeroAddress, methodOffsets[methodIndex])
          )
        )
      );

      const localValid = (
        checkLocal && (
          !localRestrictions
          || (
            methodIndex < methodOffsets.length
            && this.methodCallAllowed(txn, app, this.txn.sender, methodOffsets[methodIndex])
          )
        )
      );

      assert(globalValid || localValid, 'method not allowed');

      // default to using global if both are valid
      // due to plugins having cooldowns we want to
      // properly attribute which is being used
      // in the case of both being allowed we default to global
      if (globalValid) {
        callerUsed.global = true;
      } else if (localValid) {
        callerUsed.local = true;
      }

      methodIndex += 1;
    }

    assert(rekeysBack, 'no rekey back found');

    return callerUsed;
  }

  private shouldSkipMethodCheck(txn: Txn, app: AppID): boolean {
    if (
      // ignore non-application calls
      txn.typeEnum !== TransactionType.ApplicationCall ||
      // ignore calls to other applications
      (txn.applicationID !== app && txn.applicationID !== this.app) ||
      // ignore rekey back assert app call
      this.ensuresRekeyBack(txn)
    ) {
      return true;
    }

    return false;
  }

  /**
   * Checks if the method call is allowed
   * 
   * @param txn the transaction being validated
   * @param app the plugin app id being validated
   * @param caller the address that triggered the plugin or global address
   * @returns whether the method call is allowed
   */
  private methodCallAllowed(txn: Txn, app: AppID, caller: Address, offset: uint64): boolean {

    assert(txn.numAppArgs > 0, 'no method signature provided');
    assert(len(txn.applicationArgs[0]) === 4, 'invalid method signature length');

    const key: PluginsKey = {
      application: app,
      allowedCaller: caller,
    };

    const methods = this.plugins(key).value.methods;
    const allowedMethod = methods[offset];

    if (allowedMethod === txn.applicationArgs[0] as bytes<4>) {
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
   * @param methodOffsets The indices of the methods being used in the group
   * if the plugin has method restrictions these indices are required to match
   * the methods used on each subsequent call to the plugin within the group
   * 
   */
  arc58_rekeyToPlugin(plugin: AppID, methodOffsets: uint64[]): void {
    const globalExists = this.plugins({ application: plugin, allowedCaller: Address.zeroAddress }).exists;
    const localExists = this.plugins({ application: plugin, allowedCaller: this.txn.sender }).exists;

    let globallyAllowed = false;
    let locallyAllowed = false;

    if (globalExists) {
      globallyAllowed = this.pluginCallAllowed(plugin, Address.zeroAddress);
    }

    if (localExists) {
      locallyAllowed = this.pluginCallAllowed(plugin, this.txn.sender);
    }

    // if the plugin does not exist or is not allowed by either the global or local caller
    // then the call is not allowed, assert check so we error out cleanly
    if (
      (!globalExists && !localExists)
      || (globalExists && !globallyAllowed && !locallyAllowed)
    ) {
      this.assertPluginCallAllowed(plugin, Address.zeroAddress);
    } else if (localExists && !locallyAllowed && !globallyAllowed) {
      this.assertPluginCallAllowed(plugin, this.txn.sender);
    }

    const used = this.assertValidGroup(plugin, methodOffsets, globallyAllowed, locallyAllowed);

    sendPayment({
      receiver: this.app.address,
      rekeyTo: plugin.address,
      note: 'rekeying to plugin app',
    });

    if (used.global) {
      this.plugins({
        application: plugin,
        allowedCaller: Address.zeroAddress
      }).value.lastCalled = globals.round;
    }

    if (used.local) {
      this.plugins({
        application: plugin,
        allowedCaller: this.txn.sender
      }).value.lastCalled = globals.round;
    }
  }

  /**
   * Temporarily rekey to a named plugin app address
   *
   * @param name The name of the plugin to rekey to
   * @param methodOffsets The indices of the methods being used in the group
   * if the plugin has method restrictions these indices are required to match
   * the methods used on each subsequent call to the plugin within the group
   * 
   */
  arc58_rekeyToNamedPlugin(name: string, methodOffsets: uint64[]): void {
    this.arc58_rekeyToPlugin(this.namedPlugins(name).value.application, methodOffsets);
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
   * @param methods The methods that are allowed to be called for the plugin by the address
   * 
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
      adminPrivileges: adminPrivileges,
      methods: methods,
    };
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
   * @param methods The methods that are allowed to be called for the plugin by the address
   * 
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
      adminPrivileges: adminPrivileges,
      methods: methods,
    };

    this.plugins(key).value = pluginInfo;
  }

  /**
   * Remove a named plugin
   *
   * @param name The plugin name
   * 
   */
  arc58_removeNamedPlugin(name: string): void {
    verifyTxn(this.txn, { sender: this.admin.value });

    assert(this.namedPlugins(name).exists, 'plugin does not exist');
    const app = this.namedPlugins(name).value;
    assert(this.plugins(app).exists, 'plugin does not exist');

    this.namedPlugins(name).delete();
    this.plugins(app).delete();
  }
}
