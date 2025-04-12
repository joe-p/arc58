import { Contract, GlobalState, BoxMap, assert, arc4, uint64, Account, TransactionType, Application, abimethod, gtxn, itxn, OnCompleteAction } from '@algorandfoundation/algorand-typescript'
import { Address, compileArc4, methodSelector } from '@algorandfoundation/algorand-typescript/arc4';
import { btoi, Global, len, Txn } from '@algorandfoundation/algorand-typescript/op'
import { ERR_ADMIN_ONLY, ERR_CANNOT_CALL_OTHER_APPS_DURING_REKEY, ERR_INVALID_METHOD_SIGNATURE_LENGTH, ERR_INVALID_ONCOMPLETE, ERR_INVALID_PLUGIN_CALL, ERR_INVALID_SENDER_ARG, ERR_INVALID_SENDER_VALUE, ERR_MALFORMED_OFFSETS, ERR_METHOD_ON_COOLDOWN, ERR_MISSING_REKEY_BACK, ERR_ONLY_ADMIN_CAN_CHANGE_ADMIN, ERR_ONLY_CREATOR_CAN_REKEY, ERR_PLUGIN_DOES_NOT_EXIST, ERR_PLUGIN_EXPIRED, ERR_PLUGIN_ON_COOLDOWN, ERR_SENDER_MUST_BE_ADMIN_OR_CONTROLLED_ADDRESS, ERR_SENDER_MUST_BE_ADMIN_PLUGIN, ERR_ZERO_ADDRESS_DELEGATION_TYPE } from './errors';

export class AllowanceKey extends arc4.Struct<{
  /** The application containing plugin logic */
  application: arc4.UintN64;
  /** The address that is allowed to initiate a rekey to the plugin */
  allowedCaller: arc4.Address;
  /** the asset the spend allowance is on */
  asset: arc4.UintN64
}> { }

export type SpendAllowanceType = arc4.UintN8

export const SpendAllowanceTypeFlat: SpendAllowanceType = new arc4.UintN8(1)
export const SpendAllowanceTypeWindow: SpendAllowanceType = new arc4.UintN8(2)
export const SpendAllowanceTypeDrip: SpendAllowanceType = new arc4.UintN8(3)

export class AllowanceInfo extends arc4.Struct<{
  /** the type of allowance to use */
  type: SpendAllowanceType
  /** the maximum size of the bucket if using drip */
  max: arc4.UintN64
  /** the amount of the asset the plugin is allowed to access or per window */
  allowed: arc4.UintN64
  /** the amount spent during the current or last interacted window */
  spent: arc4.UintN64
  /** the rate the allowance should be expanded */
  interval: arc4.UintN64
  /** the amount leftover when the bucket was last accessed */
  last: arc4.UintN64
}> { }

export class arc4FundsRequest extends arc4.Struct<{
  asset: arc4.UintN64;
  amount: arc4.UintN64;
}> { }

export class PluginsKey extends arc4.Struct<{
  /** The application containing plugin logic */
  application: arc4.UintN64;
  /** The address that is allowed to initiate a rekey to the plugin */
  allowedCaller: arc4.Address;
}> { }

export const DelegationTypeSelf = new arc4.UintN8(1)
export const DelegationTypeAgent = new arc4.UintN8(2)
export const DelegationTypeOther = new arc4.UintN8(3)

export class PluginInfo extends arc4.Struct<{
  /** Whether the plugin has permissions to change the admin account */
  admin: arc4.Bool;
  /** the type of delegation the plugin is using */
  delegationType: arc4.UintN8;
  /** the spending account to use for the plugin */
  spendingApp: arc4.UintN64;
  /** The last round or unix time at which this plugin can be called */
  lastValid: arc4.UintN64;
  /** The number of rounds or seconds that must pass before the plugin can be called again */
  cooldown: arc4.UintN64;
  /** The methods that are allowed to be called for the plugin by the address */
  methods: arc4.DynamicArray<MethodInfo>;
  /** Whether the plugin has allowance restrictions */
  useAllowance: arc4.Bool;
  /** Whether to use unix timestamps or round for lastValid and cooldown */
  useRounds: arc4.Bool;
  /** The last round or unix time the plugin was called */
  lastCalled: arc4.UintN64;
  /** The round or unix time the plugin was installed */
  start: arc4.UintN64;
}> { }

export class MethodRestriction extends arc4.Struct<{
  /** The method signature */
  selector: arc4.StaticBytes<4>;
  /** The number of rounds that must pass before the method can be called again */
  cooldown: arc4.UintN64;
}> { }

export class MethodInfo extends arc4.Struct<{
  /** The method signature */
  selector: arc4.StaticBytes<4>;
  /** The number of rounds that must pass before the method can be called again */
  cooldown: arc4.UintN64;
  /** The last round the method was called */
  lastCalled: arc4.UintN64;
}> { }

type PluginValidation = {
  exists: boolean;
  expired: boolean;
  hasCooldown: boolean;
  onCooldown: boolean;
  hasMethodRestrictions: boolean;
  valid: boolean;
}

type MethodValidation = {
  methodAllowed: boolean;
  methodHasCooldown: boolean;
  methodOnCooldown: boolean;
}

type FullPluginValidation = {
  exists: boolean;
  expired: boolean;
  hasCooldown: boolean;
  onCooldown: boolean;
  hasMethodRestrictions: boolean;
  methodAllowed: boolean;
  methodHasCooldown: boolean;
  methodOnCooldown: boolean;
  valid: boolean;
}

export class SpendContract extends Contract {

  pluginID = GlobalState<Application>({ key: 'plugin_id' })

  // @ts-ignore
  @abimethod({ onCreate: 'require' })
  createApplication(plugin: uint64): void {
    this.pluginID.value = Application(plugin)
  }

  rekey(): void {
    assert(Txn.sender === Global.creatorAddress, ERR_ONLY_CREATOR_CAN_REKEY)

    itxn
      .payment({
        amount: 0,
        rekeyTo: Global.creatorAddress,
        fee: 0,
      })
      .submit()
  }

  /**
   * optin tells the contract to opt into an asa
   * @param payment The payment transaction
   * @param asset The asset to be opted into
   */
  optin(payment: gtxn.PaymentTxn, asset: uint64): void {
    assert(
      Txn.sender === Global.creatorAddress ||
      Txn.sender === this.pluginID.value.address,
    )
    assert(payment.receiver === Global.currentApplicationAddress)
    assert(payment.amount === Global.assetOptInMinBalance)

    itxn
      .assetTransfer({
        assetReceiver: Global.currentApplicationAddress,
        assetAmount: 0,
        xferAsset: asset,
        fee: 0,
      })
      .submit()
  }

  // @ts-ignore
  @abimethod({ allowActions: ['DeleteApplication'] })
  deleteApplication(): void {}
}

export class AbstractedAccount extends Contract {

  /** The admin of the abstracted account. This address can add plugins and initiate rekeys */
  admin = GlobalState<Account>({ key: 'admin' })
  /** The address this app controls */
  controlledAddress = GlobalState<Account>({ key: 'controlled_address' });
  /** The last time the contract was interacted with in unix time */
  lastUserInteraction = GlobalState<uint64>({ key: 'last_user_interaction' })
  /** The last time state has changed on the abstracted account (not including lastCalled for cooldowns) in unix time */
  lastChange = GlobalState<uint64>({ key: 'last_change' })

  /**
   * TEMPORARY STATE FIELDS
   * 
   * These are global state fields that are used for sharing metadata about usage
   * of the smart wallet and cleared before the end of the usage of the plugin.
   * by doing this we avoid sending application calls to fetch box data
   * & save ourselves from adding more arg requirements for plugins to adhere to.
   */

  /** The spending address for the currently active plugin */
  spendingAddress = GlobalState<Address>({ key: 'spending_address' })

  /** Plugins that add functionality to the controlledAddress and the account that has permission to use it. */
  plugins = BoxMap<PluginsKey, PluginInfo>({ keyPrefix: 'p' });

  /** Plugins that have been given a name for discoverability */
  namedPlugins = BoxMap<string, PluginsKey>({ keyPrefix: 'n' });

  /** The Allowances for plugins installed on the smart contract with useAllowance set to true */
  allowances = BoxMap<AllowanceKey, AllowanceInfo>({ keyPrefix: 'a' })

  private updateLastUserInteraction() {
    this.lastUserInteraction.value = Global.latestTimestamp
  }

  private updateLastChange() {
    this.lastChange.value = Global.latestTimestamp
  }

  private pluginCallAllowed(app: arc4.UintN64, caller: arc4.Address, method: arc4.StaticBytes<4>): boolean {
    const key = new PluginsKey({ application: app, allowedCaller: caller });

    if (!this.plugins(key).exists) {
      return false;
    }

    const methods = this.plugins(key).value.methods.copy();
    let methodAllowed = methods.length > 0 ? false : true;
    for (let i: uint64 = 0; i < methods.length; i += 1) {
      if (methods[i].selector === method) {
        methodAllowed = true;
        break;
      }
    }

    const p = this.plugins(key).value.copy();
    const epochRef = p.useRounds.native ? Global.round : Global.latestTimestamp;

    return (
      p.lastCalled.native >= epochRef &&
      (epochRef - p.lastCalled.native) >= p.cooldown.native &&
      methodAllowed
    )
  }

  private txnRekeysBack(txn: gtxn.Transaction): boolean {
    // this check is for manual rekeyTo calls, it only ever uses the controlled address so its okay to hardcode it here
    if (txn.sender === this.controlledAddress.value && txn.rekeyTo === Global.currentApplicationAddress) {
      return true;
    }

    return (
      txn.type === TransactionType.ApplicationCall
      && txn.appId === Global.currentApplicationId
      && txn.numAppArgs === 1
      && txn.onCompletion === OnCompleteAction.NoOp
      && txn.appArgs(0) === methodSelector('arc58_verifyAuthAddr()void')
    )
  }

  private assertRekeysBack(): void {
    let rekeysBack = false;
    for (let i: uint64 = (Txn.groupIndex + 1); i < Global.groupSize; i += 1) {
      const txn = gtxn.Transaction(i)

      if (this.txnRekeysBack(txn)) {
        rekeysBack = true;
        break;
      }
    }

    assert(rekeysBack, ERR_MISSING_REKEY_BACK);
  }

  private pluginCheck(key: PluginsKey): PluginValidation {

    const exists = this.plugins(key).exists;
    if (!exists) {
      return {
        exists: false,
        expired: true,
        hasCooldown: true,
        onCooldown: true,
        hasMethodRestrictions: false,
        valid: false
      }
    }

    const pluginInfo = this.plugins(key).value.copy()
    const epochRef = pluginInfo.useRounds.native ? Global.round : Global.latestTimestamp;

    const expired = epochRef > pluginInfo.lastValid.native;
    const hasCooldown = pluginInfo.cooldown.native > 0;
    const onCooldown = (epochRef - pluginInfo.lastCalled.native) < pluginInfo.cooldown.native;
    const hasMethodRestrictions = pluginInfo.methods.length > 0;

    const valid = exists && !expired && !onCooldown;

    return {
      exists,
      expired,
      hasCooldown,
      onCooldown,
      hasMethodRestrictions,
      valid
    }
  }

  private fullPluginCheck(
    key: PluginsKey,
    txn: gtxn.ApplicationCallTxn,
    methodOffsets: arc4.DynamicArray<arc4.UintN64>,
    methodIndex: uint64
  ): FullPluginValidation {

    const check = this.pluginCheck(key);

    if (!check.valid) {
      return {
        ...check,
        methodAllowed: false,
        methodHasCooldown: true,
        methodOnCooldown: true
      }
    }

    let mCheck: MethodValidation = {
      methodAllowed: !check.hasMethodRestrictions,
      methodHasCooldown: false,
      methodOnCooldown: false
    }

    if (check.hasMethodRestrictions) {
      assert(methodIndex < methodOffsets.length, ERR_MALFORMED_OFFSETS);
      mCheck = this.methodCheck(key, txn, methodOffsets[methodIndex].native);
    }

    return {
      ...check,
      ...mCheck,
      valid: check.valid && mCheck.methodAllowed
    }
  }

  /**
   * Guarantee that our txn group is valid in a single loop over all txns in the group
   * 
   * @param key the box key for the plugin were checking
   * @param methodOffsets the indices of the methods being used in the group
   */
  private assertValidGroup(key: PluginsKey, methodOffsets: arc4.DynamicArray<arc4.UintN64>) {

    const epochRef = this.plugins(key).value.useRounds.native
      ? Global.round
      : Global.latestTimestamp;

    const initialCheck = this.pluginCheck(key);

    assert(initialCheck.exists, ERR_PLUGIN_DOES_NOT_EXIST);
    assert(!initialCheck.expired, ERR_PLUGIN_EXPIRED);
    assert(!initialCheck.onCooldown, ERR_PLUGIN_ON_COOLDOWN);

    let rekeysBack = false;
    let methodIndex: uint64 = 0;

    for (let i: uint64 = (Txn.groupIndex + 1); i < Global.groupSize; i += 1) {
      const txn = gtxn.Transaction(i)

      if (this.txnRekeysBack(txn)) {
        rekeysBack = true;
        break;
      }

      if (txn.type !== TransactionType.ApplicationCall) {
        continue;
      }

      assert(txn.appId.id === key.application.native, ERR_CANNOT_CALL_OTHER_APPS_DURING_REKEY);
      assert(txn.onCompletion === OnCompleteAction.NoOp, ERR_INVALID_ONCOMPLETE);
      // ensure the first arg to a method call is the app id itself
      // index 1 is used because arg[0] is the method selector
      assert(txn.numAppArgs > 1, ERR_INVALID_SENDER_ARG);
      assert(Application(btoi(txn.appArgs(1))) === Global.currentApplicationId, ERR_INVALID_SENDER_VALUE);
      
      const check = this.fullPluginCheck(key, txn, methodOffsets, methodIndex);

      assert(!check.methodOnCooldown, ERR_METHOD_ON_COOLDOWN);
      assert(check.valid, ERR_INVALID_PLUGIN_CALL);

      if (initialCheck.hasCooldown) {
        this.plugins(key).value.lastCalled = new arc4.UintN64(epochRef)
      }

      methodIndex += 1;
    }

    assert(rekeysBack, ERR_MISSING_REKEY_BACK);
  }

  /**
   * Checks if the method call is allowed
   * 
   * @param key the box key for the plugin were checking
   * @param caller the address that triggered the plugin or global address
   * @param offset the index of the method being used
   * @returns whether the method call is allowed
   */
  private methodCheck(key: PluginsKey, txn: gtxn.ApplicationCallTxn, offset: uint64): MethodValidation {

    assert(len(txn.appArgs(0)) === 4, ERR_INVALID_METHOD_SIGNATURE_LENGTH);
    const selectorArg = new arc4.StaticBytes<4>(txn.appArgs(0));

    const methods = this.plugins(key).value.methods.copy()
    const allowedMethod = methods[offset].copy();

    const hasCooldown = allowedMethod.cooldown.native > 0;

    const useRounds = this.plugins(key).value.useRounds.native

    const epochRef = useRounds ? Global.round : Global.latestTimestamp;
    const onCooldown = (epochRef - allowedMethod.lastCalled.native) < allowedMethod.cooldown.native;

    if (allowedMethod.selector === selectorArg && (!hasCooldown || !onCooldown)) {
      // update the last called round for the method
      if (hasCooldown) {
        const lastCalled = useRounds
          ? new arc4.UintN64(Global.round)
          : new arc4.UintN64(Global.latestTimestamp);

        methods[offset].lastCalled = lastCalled;
        this.plugins(key).value = new PluginInfo({
          ...this.plugins(key).value,
          methods: methods.copy()
        });
      }

      return {
        methodAllowed: true,
        methodHasCooldown: hasCooldown,
        methodOnCooldown: onCooldown
      }
    }

    return {
      methodAllowed: false,
      methodHasCooldown: true,
      methodOnCooldown: true
    }
  }

  private transferFunds(key: PluginsKey, fundsRequests: arc4.DynamicArray<arc4FundsRequest>): void {
    for (let i: uint64 = 0; i < fundsRequests.length; i += 1) {
      const request = fundsRequests[i].copy();
      const pluginInfo = this.plugins(key).value.copy()
      const spendingAddress = Application(pluginInfo.spendingApp.native).address

      const allowanceKey = new AllowanceKey({
        allowedCaller: key.allowedCaller,
        application: key.application,
        asset: request.asset
      });

      this.verifyAllowance(
        pluginInfo.start.native,
        pluginInfo.useRounds.native,
        allowanceKey,
        request
      );

      if (request.asset.native !== 0) {
        itxn
          .assetTransfer({
            sender: this.controlledAddress.value,
            assetReceiver: spendingAddress,
            assetAmount: request.amount.native,
            xferAsset: request.asset.native,
            fee: 0,
          })
          .submit();
      } else {
        itxn
          .payment({
            sender: this.controlledAddress.value,
            receiver: spendingAddress,
            amount: request.amount.native,
            fee: 0,
          })
          .submit();
      }
    }
  }

  private verifyAllowance(
    start: uint64,
    useRounds: boolean,
    key: AllowanceKey,
    fundRequest: arc4FundsRequest
  ): void {
    assert(this.allowances(key).exists, 'Allowance does not exist');
    const allowance = this.allowances(key).value.copy();
    const arc4EpochRef = useRounds
      ? new arc4.UintN64(Global.round)
      : new arc4.UintN64(Global.latestTimestamp)

    if (allowance.type === SpendAllowanceTypeFlat) {
      const spent = allowance.spent.native
      const leftover: uint64 = allowance.allowed.native - spent;
      const amount = fundRequest.amount.native

      assert(leftover >= amount, 'Allowance exceeded');

      this.allowances(key).value.spent = new arc4.UintN64(spent + amount);
    } else if (allowance.type === SpendAllowanceTypeWindow) {
      const currentWindowStart: uint64 = this.getLatestWindowStart(useRounds, start, allowance.interval.native)
      
      const allowed = allowance.allowed.native
      const amount = fundRequest.amount.native
      const spent = allowance.spent.native

      if (currentWindowStart > allowance.last.native) {
        assert(allowed >= amount, 'Allowance exceeded');
      } else {
        const leftover: uint64 = allowed - spent;
        assert(leftover >= amount, 'Allowance exceeded');
      }

      const newSpent = new arc4.UintN64(spent + amount);

      this.allowances(key).value = new AllowanceInfo({
        ...this.allowances(key).value,
        spent: newSpent,
        last: arc4EpochRef
      })

    } else if (allowance.type === SpendAllowanceTypeDrip) {
      const epochRef = useRounds ? Global.round : Global.latestTimestamp;

      const amount = fundRequest.amount.native

      const max = allowance.max.native
      const interval = allowance.interval.native
      const accrualRate = allowance.allowed.native
      const lastLeftover = allowance.spent.native
      const last = allowance.last.native

      const passed: uint64 = epochRef - last
      const accrued: uint64 = lastLeftover + ((passed / interval) * accrualRate)

      const available: uint64 = accrued > max ? max : accrued
      
      assert(available >= amount, 'Allowance exceeded');

      const leftover = new arc4.UintN64(available - amount)

      this.allowances(key).value = new AllowanceInfo({
        ...this.allowances(key).value,
        spent: leftover,
        last: arc4EpochRef
      })
    }
  }

  private getLatestWindowStart(useRounds: boolean, start: uint64, interval: uint64): uint64 {
    if (useRounds) {
      return Global.round - ((Global.round - start) % interval)
    }
    return Global.latestTimestamp - ((Global.latestTimestamp - start) % interval)
  }

  /**
   * What the value of this.address.value.authAddr should be when this.controlledAddress
   * is able to be controlled by this app. It will either be this.app.address or zeroAddress
   */
  private getAuthAddr(): Account {
    return this.controlledAddress.value === Global.currentApplicationAddress
      ? Global.zeroAddress // contract controls itself
      : Global.currentApplicationAddress; // contract controls a different account
  }

  /**
   * Create an abstracted account application.
   * This is not part of ARC58 and implementation specific.
   *
   * @param controlledAddress The address of the abstracted account. If zeroAddress, then the address of the contract account will be used
   * @param admin The admin for this app
   */
  // @ts-ignore
  @abimethod({ onCreate: 'require' })
  createApplication(controlledAddress: arc4.Address, admin: arc4.Address) {
    assert(
      Txn.sender === controlledAddress.native
      || Txn.sender === admin.native,
      ERR_SENDER_MUST_BE_ADMIN_OR_CONTROLLED_ADDRESS
    );
    assert(admin !== controlledAddress);

    this.admin.value = admin.native;
    this.controlledAddress.value = controlledAddress.native === Global.zeroAddress ? Global.currentApplicationAddress : controlledAddress.native;
    this.updateLastUserInteraction()
    this.updateLastChange()
  }

  /**
   * Attempt to change the admin for this app. Some implementations MAY not support this.
   *
   * @param newAdmin The new admin
   */
  arc58_changeAdmin(newAdmin: arc4.Address): void {
    assert(Txn.sender === this.admin.value, ERR_ONLY_ADMIN_CAN_CHANGE_ADMIN);
    this.admin.value = newAdmin.native;
    this.updateLastUserInteraction()
    this.updateLastChange()
  }

  /**
   * Attempt to change the admin via plugin.
   *
   * @param plugin The app calling the plugin
   * @param allowedCaller The address that triggered the plugin
   * @param newAdmin The new admin
   *
   */
  arc58_pluginChangeAdmin(
    plugin: arc4.UintN64,
    allowedCaller: arc4.Address,
    newAdmin: arc4.Address
  ): void {
    assert(Txn.sender === Application(plugin.native).address, ERR_SENDER_MUST_BE_ADMIN_PLUGIN);
    assert(
      this.controlledAddress.value.authAddress === Application(plugin.native).address,
      'This plugin is not in control of the account'
    );

    const key = new PluginsKey({ application: plugin, allowedCaller: allowedCaller });

    assert(
      this.plugins(key).exists && this.plugins(key).value.admin.native,
      'This plugin does not have admin privileges'
    );

    this.admin.value = newAdmin.native;
    if (this.plugins(key).value.delegationType === DelegationTypeSelf) {
      this.updateLastUserInteraction();
    }
    this.updateLastChange()
  }

  /**
   * Get the admin of this app. This method SHOULD always be used rather than reading directly from state
   * because different implementations may have different ways of determining the admin.
   */
  // @ts-ignore
  @abimethod({ readonly: true })
  arc58_getAdmin(): arc4.Address {
    return new arc4.Address(this.admin.value);
  }

  /**
   * Verify the abstracted account is rekeyed to this app
   */
  arc58_verifyAuthAddr(): void {
    assert(this.spendingAddress.value.native.authAddress === this.getAuthAddr());
    this.spendingAddress.value = new Address(Global.zeroAddress)
  }

  /**
   * Rekey the abstracted account to another address. Primarily useful for rekeying to an EOA.
   *
   * @param addr The address to rekey to
   * @param flash Whether or not this should be a flash rekey. If true, the rekey back to the app address must done in the same txn group as this call
   */
  arc58_rekeyTo(address: arc4.Address, flash: arc4.Bool): void {
    assert(Txn.sender === this.admin.value, ERR_ADMIN_ONLY);

    itxn
      .payment({
        sender: this.controlledAddress.value,
        receiver: address.native,
        rekeyTo: address.native,
        note: 'rekeying abstracted account',
        fee: 0,
      })
      .submit();

    if (flash.native) this.assertRekeysBack();

    this.updateLastUserInteraction();
  }

  /**
   * check whether the plugin can be used
   *
   * @param plugin the plugin to be rekeyed to
   * @param address the address that triggered the plugin
   * @returns whether the plugin can be called via txn sender or globally
   */
  // @ts-ignore
  @abimethod({ readonly: true })
  arc58_canCall(
    plugin: arc4.UintN64,
    global: boolean,
    address: arc4.Address,
    method: arc4.StaticBytes<4>
  ): boolean {
    if (global) {
      this.pluginCallAllowed(plugin, new arc4.Address(Global.zeroAddress), method);
    }
    return this.pluginCallAllowed(plugin, address, method);
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
  arc58_rekeyToPlugin(
    plugin: arc4.UintN64,
    global: boolean,
    methodOffsets: arc4.DynamicArray<arc4.UintN64>,
    fundsRequest: arc4.DynamicArray<arc4FundsRequest>
  ): void {
    const pluginApp = Application(plugin.native)

    const key = new PluginsKey({
      application: plugin,
      allowedCaller: global
        ? new Address(Global.zeroAddress)
        : new Address(Txn.sender)
    });

    if (this.plugins(key).value.spendingApp.native !== 0) {
      this.spendingAddress.value = new Address(pluginApp.address);
    } else {
      this.spendingAddress.value = new Address(this.controlledAddress.value);
    }

    this.assertValidGroup(key, methodOffsets);
    this.transferFunds(key, fundsRequest);

    itxn
      .payment({
        sender: this.spendingAddress.value.native,
        receiver: this.spendingAddress.value.native,
        rekeyTo: pluginApp.address,
        note: 'rekeying to plugin app',
        fee: 0,
      })
      .submit();

    if (this.plugins(key).value.delegationType === DelegationTypeSelf) {
      this.updateLastUserInteraction();
    }
  }

  /**
   * Temporarily rekey to a named plugin app address
   *
   * @param name The name of the plugin to rekey to
   * @param global Whether this is global or local plugin usage
   * @param methodOffsets The indices of the methods being used in the group
   * if the plugin has method restrictions these indices are required to match
   * the methods used on each subsequent call to the plugin within the group
   * 
   */
  arc58_rekeyToNamedPlugin(name: string, global: boolean, methodOffsets: arc4.DynamicArray<arc4.UintN64>, fundsRequest: arc4.DynamicArray<arc4FundsRequest>): void {
    this.arc58_rekeyToPlugin(
      this.namedPlugins(name).value.application,
      global,
      methodOffsets,
      fundsRequest
    );
  }

  /**
   * Add an app to the list of approved plugins
   *
   * @param app The app to add
   * @param allowedCaller The address of that's allowed to call the app
   * or the global zero address for all addresses
   * @param delegationType the ownership of the delegation for last_interval updates
   * @param lastValidRound The round when the permission expires
   * @param cooldown  The number of rounds that must pass before the plugin can be called again
   * @param adminPrivileges Whether the plugin has permissions to change the admin account
   * @param methods The methods that are allowed to be called for the plugin by the address
   * 
   */
  arc58_addPlugin(
    app: arc4.UintN64,
    allowedCaller: arc4.Address,
    admin: arc4.Bool,
    delegationType: arc4.UintN8,
    lastValid: arc4.UintN64,
    cooldown: arc4.UintN64,
    methods: arc4.DynamicArray<MethodRestriction>,
    useAllowance: arc4.Bool,
    useRounds: arc4.Bool,
  ): void {
    assert(Txn.sender === this.admin.value, ERR_ADMIN_ONLY);
    const badDelegationCombo = (
      delegationType === DelegationTypeSelf &&
      allowedCaller.native === Global.zeroAddress
    )
    assert(!badDelegationCombo, ERR_ZERO_ADDRESS_DELEGATION_TYPE)
    const key = new PluginsKey({ application: app, allowedCaller: allowedCaller });

    let methodInfos = new arc4.DynamicArray<MethodInfo>();
    for (let i: uint64 = 0; i < methods.length; i += 1) {
      methodInfos.push(new MethodInfo({
        selector: methods[i].selector,
        cooldown: methods[i].cooldown,
        lastCalled: new arc4.UintN64(0),
      }));
    }

    const epochRef = useRounds.native ? Global.round : Global.latestTimestamp;

    // TODO: if controlled account != arc58 contract
    // ensure the MBR of the created app & box allocations
    // is in the arc58 contract

    let spendingApp = new arc4.UintN64(0)
    if (useAllowance.native) {
      const spendContract = compileArc4(SpendContract);
      spendingApp = new arc4.UintN64(
        spendContract.call
          .createApplication({ args: [app.native] })
          .itxn
          .createdApp
          .id
      )
    }

    this.plugins(key).value = new PluginInfo({
      admin,
      delegationType,
      spendingApp,
      lastValid,
      cooldown,
      methods: methodInfos.copy(),
      useAllowance,
      useRounds,
      lastCalled: new arc4.UintN64(0),
      start: new arc4.UintN64(epochRef),
    });

    this.updateLastUserInteraction();
    this.updateLastChange();
  }

  /**
   * Remove an app from the list of approved plugins
   *
   * @param app The app to remove
   * @param allowedCaller The address of that's allowed to call the app
   * @param methods The methods that to remove before attempting to uninstall the plugin
   * or the global zero address for all addresses
   */
  arc58_removePlugin(app: arc4.UintN64, allowedCaller: arc4.Address): void {
    assert(Txn.sender === this.admin.value, ERR_ADMIN_ONLY);

    const key = new PluginsKey({ application: app, allowedCaller: allowedCaller });
    assert(this.plugins(key).exists, ERR_PLUGIN_DOES_NOT_EXIST);
    this.plugins(key).delete();

    this.updateLastUserInteraction();
    this.updateLastChange();
  }

  /**
   * Add a named plugin
   *
   * @param name The plugin name
   * @param app The plugin app
   * @param allowedCaller The address of that's allowed to call the app
   * or the global zero address for all addresses
   * @param delegationType the ownership of the delegation for last_interval updates
   * @param lastValidRound The round when the permission expires
   * @param cooldown  The number of rounds that must pass before the plugin can be called again
   * @param adminPrivileges Whether the plugin has permissions to change the admin account
   * @param methods The methods that are allowed to be called for the plugin by the address
   * 
   */
  arc58_addNamedPlugin(
    name: arc4.Str,
    app: arc4.UintN64,
    allowedCaller: arc4.Address,
    admin: arc4.Bool,
    delegationType: arc4.UintN8,
    lastValid: arc4.UintN64,
    cooldown: arc4.UintN64,
    methods: arc4.DynamicArray<MethodRestriction>,
    useAllowance: arc4.Bool,
    useRounds: arc4.Bool,
  ): void {
    assert(Txn.sender === this.admin.value, ERR_ADMIN_ONLY);
    assert(!this.namedPlugins(name.native).exists);

    const key = new PluginsKey({ application: app, allowedCaller: allowedCaller });
    this.namedPlugins(name.native).value = key.copy();

    let methodInfos = new arc4.DynamicArray<MethodInfo>();
    for (let i: uint64 = 0; i < methods.length; i += 1) {
      methodInfos.push(new MethodInfo({
        selector: methods[i].selector,
        cooldown: methods[i].cooldown,
        lastCalled: new arc4.UintN64(0),
      }));
    }

    let spendingApp = new arc4.UintN64(0)
    if (useAllowance.native) {
      const spendContract = compileArc4(SpendContract);
      spendingApp = new arc4.UintN64(
        spendContract.call
          .createApplication({ args: [app.native] })
          .itxn
          .createdApp
          .id
      )
    }

    const epochRef = useRounds.native ? Global.round : Global.latestTimestamp;

    this.plugins(key).value = new PluginInfo({
      admin,
      delegationType,
      spendingApp,
      lastValid,
      cooldown,
      methods: methodInfos.copy(),
      useAllowance,
      useRounds,
      lastCalled: new arc4.UintN64(0),
      start: new arc4.UintN64(epochRef)
    })

    this.updateLastUserInteraction();
    this.updateLastChange();
  }

  /**
   * Remove a named plugin
   *
   * @param name The plugin name
   * 
   */
  arc58_removeNamedPlugin(name: arc4.Str): void {
    assert(Txn.sender === this.admin.value, ERR_ADMIN_ONLY);
    assert(this.namedPlugins(name.native).exists, ERR_PLUGIN_DOES_NOT_EXIST);
    const app = this.namedPlugins(name.native).value.copy();
    assert(this.plugins(app).exists, ERR_PLUGIN_DOES_NOT_EXIST);

    this.namedPlugins(name.native).delete();
    this.plugins(app).delete();
    this.updateLastUserInteraction();
    this.updateLastChange();
  }
}
