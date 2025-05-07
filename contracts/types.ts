import { uint64 } from "@algorandfoundation/algorand-typescript";
import { Address, Bool, DynamicArray, StaticBytes, Struct, UintN64, UintN8 } from "@algorandfoundation/algorand-typescript/arc4";

export class arc4AllowanceKey extends Struct<{
  /** The application containing plugin logic */
  application: UintN64;
  /** The address that is allowed to initiate a rekey to the plugin */
  allowedCaller: Address;
  /** the asset the spend allowance is on */
  asset: UintN64
}> { }

export type AllowanceKey = {
  application: uint64;
  allowedCaller: Address;
  asset: uint64;
}

export type SpendAllowanceType = UintN8

export const SpendAllowanceTypeFlat: SpendAllowanceType = new UintN8(1)
export const SpendAllowanceTypeWindow: SpendAllowanceType = new UintN8(2)
export const SpendAllowanceTypeDrip: SpendAllowanceType = new UintN8(3)

export class arc4AllowanceInfo extends Struct<{
  /** the type of allowance to use */
  type: SpendAllowanceType
  /** the maximum size of the bucket if using drip */
  max: UintN64
  /** the amount of the asset the plugin is allowed to access or per window */
  allowed: UintN64
  /** the amount spent during the current or last interacted window */
  spent: UintN64
  /** the rate the allowance should be expanded */
  interval: UintN64
  /** the amount leftover when the bucket was last accessed */
  last: UintN64
}> { }

export type AllowanceInfo = {
  type: SpendAllowanceType
  max: uint64
  allowed: uint64
  spent: uint64
  interval: uint64
  last: uint64
}

export class arc4FundsRequest extends Struct<{
  asset: UintN64;
  amount: UintN64;
}> { }

export type FundsRequest = {
  asset: uint64;
  amount: uint64;
}

export class arc4PluginsKey extends Struct<{
  /** The application containing plugin logic */
  application: UintN64;
  /** The address that is allowed to initiate a rekey to the plugin */
  allowedCaller: Address;
}> { }

export type PluginKey = {
  application: uint64;
  allowedCaller: Address;
}

export const DelegationTypeSelf = new UintN8(1)
export const DelegationTypeAgent = new UintN8(2)
export const DelegationTypeOther = new UintN8(3)

export class arc4PluginInfo extends Struct<{
  /** Whether the plugin has permissions to change the admin account */
  admin: Bool;
  /** the type of delegation the plugin is using */
  delegationType: UintN8;
  /** the spending account to use for the plugin */
  spendingApp: UintN64;
  /** The last round or unix time at which this plugin can be called */
  lastValid: UintN64;
  /** The number of rounds or seconds that must pass before the plugin can be called again */
  cooldown: UintN64;
  /** The methods that are allowed to be called for the plugin by the address */
  methods: DynamicArray<arc4MethodInfo>;
  /** Whether the plugin has allowance restrictions */
  useAllowance: Bool;
  /** Whether to use unix timestamps or round for lastValid and cooldown */
  useRounds: Bool;
  /** The last round or unix time the plugin was called */
  lastCalled: UintN64;
  /** The round or unix time the plugin was installed */
  start: UintN64;
}> { }

export type PluginInfo = {
  admin: boolean;
  delegationType: UintN8;
  spendingApp: uint64;
  lastValid: uint64;
  cooldown: uint64;
  methods: DynamicArray<arc4MethodInfo>;
  useAllowance: boolean;
  useRounds: boolean;
  lastCalled: uint64;
  start: uint64;
}

export class arc4MethodRestriction extends Struct<{
  /** The method signature */
  selector: StaticBytes<4>;
  /** The number of rounds that must pass before the method can be called again */
  cooldown: UintN64;
}> { }

export type MethodRestriction = {
  selector: StaticBytes<4>;
  cooldown: uint64;
}

export class arc4MethodInfo extends Struct<{
  /** The method signature */
  selector: StaticBytes<4>;
  /** The number of rounds that must pass before the method can be called again */
  cooldown: UintN64;
  /** The last round the method was called */
  lastCalled: UintN64;
}> { }

export type MethodInfo = {
  selector: StaticBytes<4>;
  cooldown: uint64;
  lastCalled: uint64;
}

export type PluginValidation = {
  exists: boolean;
  expired: boolean;
  hasCooldown: boolean;
  onCooldown: boolean;
  hasMethodRestrictions: boolean;
  valid: boolean;
}

export type MethodValidation = {
  methodAllowed: boolean;
  methodHasCooldown: boolean;
  methodOnCooldown: boolean;
}

export type FullPluginValidation = {
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