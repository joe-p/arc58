import { Contract } from '@algorandfoundation/tealscript';

export type PluginsKey = {
  /** The application containing plugin logic */
  application: AppID;
  /** The address that is allowed to initiate a rekey to the plugin */
  allowedCaller: Address;
};

export type PluginInfo = {
  /** The last round at which this plugin can be called */
  lastValidRound: uint64;
  /** The number of rounds that must pass before the plugin can be called again */
  cooldown: uint64;
  /** The last round the plugin was called */
  lastCalled: uint64;
  /** Whether the plugin has permissions to change the admin account */
  adminPrivileges: boolean;
  /** The methods that are allowed to be called for the plugin by the address */
  methods: MethodInfo[];
};

export type MethodInfo = {
  /** The method signature */
  selector: bytes<4>;
  /** The number of rounds that must pass before the method can be called again */
  cooldown: uint64;
  /** The last round the method was called */
  lastCalled: uint64;
};

export class AbstractedAccount extends Contract {
  /** Target AVM 11 */
  programVersion = 11;

  /** The admin of the abstracted account. This address can add plugins and initiate rekeys */
  admin = GlobalStateKey<Address>({ key: 'admin' });

  /** The address this app controls */
  controlledAddress = GlobalStateKey<Address>({ key: 'controlled_address' });

  /**
   * Plugins that add functionality to the controlledAddress and the account that has permission to use it.
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
      (globals.round - this.plugins(key).value.lastCalled) >= this.plugins(key).value.cooldown,
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

  private txnRekeysBack(txn: Txn): boolean {
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

      if (this.txnRekeysBack(txn)) {
        rekeysBack = true;
      }
    }

    assert(rekeysBack, 'rekey back not found');
  }

  /**
   * Guarantee that our txn group is valid in a single loop over all txns in the group
   * 
   * @param app the plugin app id being validated
   * @param methodOffsets the indices of the methods being used in the group
   * @param globallyAllowed whether to check the global caller for method restrictions
   * @param locallyAllowed whether to check the local caller for method restrictions
   */
  private assertValidGroup(app: AppID, methodOffsets: uint64[], globallyAllowed: boolean, locallyAllowed: boolean) {
    const gkey: PluginsKey = { application: app, allowedCaller: Address.zeroAddress };
    const key: PluginsKey = { application: app, allowedCaller: this.txn.sender };

    const hasGlobalMethodRestrictions = globallyAllowed && this.plugins(gkey).value.methods.length > 0;
    const hasGlobalPluginCooldown = globallyAllowed && this.plugins(gkey).value.cooldown > 0;
    const hasLocalMethodRestrictions = locallyAllowed && this.plugins(key).value.methods.length > 0;
    const hasLocalPluginCooldown = locallyAllowed && this.plugins(key).value.cooldown > 0;

    let rekeysBack = false;
    let methodIndex = 0;

    for (let i = (this.txn.groupIndex + 1); i < this.txnGroup.length; i += 1) {
      const txn = this.txnGroup[i];

      if (this.txnRekeysBack(txn)) {
        rekeysBack = true;
        break;
      }

      if (txn.typeEnum !== TransactionType.ApplicationCall) {
        continue;
      }

      // ensure the first arg to a method call is the app id itself
      // index 1 is used because arg[0] is the method selector
      assert(txn.applicationID === app, 'wrong app id');
      assert(txn.onCompletion === 0, 'invalid onComplete');
      assert(txn.numAppArgs > 1, 'no app id provided');
      assert(btoi(txn.applicationArgs[1]) === this.app.id, 'wrong app id');

      const globalOnCooldown = hasGlobalPluginCooldown
        && (globals.round - this.plugins(gkey).value.lastCalled) < this.plugins(gkey).value.cooldown;

      const validGlobalMethod = globallyAllowed
        && methodIndex < methodOffsets.length
        && this.methodCallAllowed(txn, app, Address.zeroAddress, methodOffsets[methodIndex])

      const globalValid = (
        globallyAllowed
        && !globalOnCooldown
        && (!hasGlobalMethodRestrictions || validGlobalMethod)
      );

      const localOnCooldown = hasLocalPluginCooldown
        && (globals.round - this.plugins(key).value.lastCalled) < this.plugins(key).value.cooldown;

      const validLocalMethod = locallyAllowed
        && methodIndex < methodOffsets.length
        && this.methodCallAllowed(txn, app, this.txn.sender, methodOffsets[methodIndex])

      const localValid = (
        locallyAllowed
        && !localOnCooldown
        && (!hasLocalMethodRestrictions || validLocalMethod)
      );

      assert(globalValid || localValid, 'method not allowed');

      // default to using global if both are valid
      // due to plugins having cooldowns we want to
      // properly attribute which is being used
      // in the case of both being allowed we default to global
      if (globalValid && hasGlobalPluginCooldown) {
        this.plugins(gkey).value.lastCalled = globals.round;
      } else if (localValid && hasLocalPluginCooldown) {
        this.plugins(key).value.lastCalled = globals.round
      }

      methodIndex += 1;
    }

    assert(rekeysBack, 'no rekey back found');
  }

  /**
   * Checks if the method call is allowed
   * 
   * @param txn the transaction being validated
   * @param app the plugin app id being validated
   * @param caller the address that triggered the plugin or global address
   * @param offset the index of the method being used
   * @returns whether the method call is allowed
   */
  private methodCallAllowed(txn: Txn, app: AppID, caller: Address, offset: uint64): boolean {

    assert(len(txn.applicationArgs[0]) === 4, 'invalid method signature length');
    const selectorArg = castBytes<bytes<4>>(txn.applicationArgs[0]);

    const key: PluginsKey = { application: app, allowedCaller: caller };

    const methods = this.plugins(key).value.methods;
    const allowedMethod = methods[offset];

    const hasCooldown = allowedMethod.cooldown > 0;
    const onCooldown = (globals.round - allowedMethod.lastCalled) < allowedMethod.cooldown;

    log(allowedMethod.selector)
    log(selectorArg)

    if (allowedMethod.selector === selectorArg && (!hasCooldown || !onCooldown)) {
      // update the last called round for the method
      if (hasCooldown) {
        this.plugins(key).value.methods[offset].lastCalled = globals.round;
      }
      return true;
    }

    return false;
  }

  /**
   * What the value of this.address.value.authAddr should be when this.controlledAddress
   * is able to be controlled by this app. It will either be this.app.address or zeroAddress
   */
  private getAuthAddr(): Address {
    return this.controlledAddress.value === this.app.address ? Address.zeroAddress : this.app.address;
  }

  /**
   * Create an abstracted account application.
   * This is not part of ARC58 and implementation specific.
   *
   * @param controlledAddress The address of the abstracted account. If zeroAddress, then the address of the contract account will be used
   * @param admin The admin for this app
   */
  createApplication(controlledAddress: Address, admin: Address): void {
    verifyAppCallTxn(this.txn, {
      sender: { includedIn: [controlledAddress, admin] },
    });

    assert(admin !== controlledAddress);

    this.admin.value = admin;
    this.controlledAddress.value = controlledAddress === Address.zeroAddress ? this.app.address : controlledAddress;
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
    assert(this.controlledAddress.value.authAddr === plugin.address, 'This plugin is not in control of the account');

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
    assert(this.controlledAddress.value.authAddr === this.getAuthAddr());
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
      sender: this.controlledAddress.value,
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
   * @param address the address that triggered the plugin
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

    this.assertValidGroup(plugin, methodOffsets, globallyAllowed, locallyAllowed);

    sendPayment({
      sender: this.controlledAddress.value,
      receiver: this.controlledAddress.value,
      rekeyTo: plugin.address,
      note: 'rekeying to plugin app',
    });
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
    methods: MethodInfo[],
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
   * @param name The plugin name
   * @param app The plugin app
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
    methods: MethodInfo[],
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
