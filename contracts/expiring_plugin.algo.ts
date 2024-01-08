import { Contract } from '@algorandfoundation/tealscript';

/**
 * ExpiringPluginFactory is a factory for dynamic general purpose expiring plugins.
 * They allow you to delegate a specific address the ability 
 * to call a single method on a specific other contract for a limited time.
 */
export class ExpiringPluginFactory extends Contract {
    programVersion = 10;

    /**
     * Mint a new expiring plugin with a specific set of rules
     * @param duration 
     * @param authAddr 
     * @param allowedApp 
     * @param method 
     */
    newExpiringPlugin(duration: uint64, authAddr: Address, allowedApp: Application, method: bytes): void {
        sendMethodCall<[uint64, Address, Application, bytes], void>({
            approvalProgram: ExpiringPlugin.approvalProgram(),
            clearStateProgram: ExpiringPlugin.clearProgram(),
            name: 'createApplication',
            methodArgs: [duration, authAddr, allowedApp, method], 
        });
    }
}


/**
 * ExpiringPlugin is a dynamic general purpose expiring plugin.
 * It allows you to delegate a specific address the ability 
 * to call a single method on a specific other contract for a limited time.
 */
export class ExpiringPlugin extends Contract {
    programVersion = 10;

    /**
     * The time at which this contract was created
     */
    createdAt = GlobalStateKey<uint64>();

    /**
     * The duration is valid for
     */
    duration = GlobalStateKey<uint64>();

    /**
     * The address that is authorized to call the method
     */
    authAddr = GlobalStateKey<Address>();

    /**
     * The application that is authorized to be called
     */
    allowedApp = GlobalStateKey<Application>();

    /**
     * The method that is authorized to be called
     */
    method = GlobalStateKey<bytes>();

    /**
     * set the all state values at mint
     * @param duration 
     * @param authAddr 
     * @param allowedApp 
     * @param method 
     */
    createApplication(duration: uint64, authAddr: Address, allowedApp: Application, method: bytes): void {
        this.createdAt.value = globals.latestTimestamp;
        this.duration.value = duration;
        this.authAddr.value = authAddr;
        this.allowedApp.value = allowedApp;
        this.method.value = method;
    }

    /**
     * verifyAppCall ensures the external app call being made
     * is valid and the contract hasn't expired
     */
    verify(sender: Account, appCall: AppCallTxn): void {
        // ensure this app call is still valid in regards to the timeout
        const expiresAt = this.createdAt.value + this.duration.value;
        assert(
            !(globals.latestTimestamp > expiresAt),
            // ensure the sender is the authAddr
            this.txn.sender === this.authAddr.value,
            // ensure the method being called is the correct method
            appCall.applicationArgs[0] === method(this.method.value)
        )

        // ensure we're calling the correct app from the correct account
        verifyAppCallTxn(appCall, {
            applicationID: this.allowedApp.value,
            sender: sender,
        });
    }

    /**
     * delete the application after it has expired
     */
    deleteApplication(): void {
        const expiresAt = this.createdAt.value + this.duration.value;
        assert(globals.latestTimestamp > expiresAt)
    }
}
