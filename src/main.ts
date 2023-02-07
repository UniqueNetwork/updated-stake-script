
import {Client, Sdk} from '@unique-nft/sdk'
import Extension, {IPolkadotExtensionAccount} from '@unique-nft/utils/extension'
import {Address} from '@unique-nft/utils'
import {a} from "@unique-nft/utils/index-533455a6"

export const SDK_BASE_URLS = {
  opal: 'https://rest.opal.uniquenetwork.dev/v1',
  quartz: 'https://rest.quartz.uniquenetwork.dev/v1',
}

// export enum sdkBaseUrl {
//     quartz = 'https://rest.quartz.uniquenetwork.dev/v1',
//     opal = 'https://rest.opal.uniquenetwork.dev/v1',
// }
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function getAccountList(): Promise<IPolkadotExtensionAccount[]> {
    const enablingResult = await Extension.Polkadot.enableAndLoadAllWallets()

    if (!enablingResult.info.extensionFound) {
    console.log('Extension.Polkadot');
    console.log(Extension.Polkadot);
        throw new Error('Extension not found')
    } else if (!enablingResult.info.accountsFound) {
        throw new Error('No accounts found')
    } else if (enablingResult.info.userHasBlockedAllWallets) {
        throw new Error('All wallets are blocked')
    } else if (enablingResult.info.userHasWalletsButHasNoAccounts) {
        throw new Error('No accounts found. Please, create an account')
    }
    return enablingResult.accounts;
}

// helper
export async function getAccountOrAddress(accountOrAccountIdOrAddress: IPolkadotExtensionAccount | string, accounts?: IPolkadotExtensionAccount[]): Promise<IPolkadotExtensionAccount | string> {
    if (!accountOrAccountIdOrAddress) throw new Error('accountOrAccountIdOrAddress parameter in function getAccountOrAddress is empty')
    if (typeof accountOrAccountIdOrAddress === 'object') {
        if (!accountOrAccountIdOrAddress.address) throw new Error('Invalid input parameters')
        return accountOrAccountIdOrAddress
    }
    if (!accounts) {
        accounts = await getAccountList()
    }
    const account = accounts.find(el => (el.id === accountOrAccountIdOrAddress))
    if (account) return account
    const address = Address.validate.substrateAddress(accountOrAccountIdOrAddress)
    //check address
    if (!(account || address)) {
        throw new Error('The input parameter is neither an address nor an account id')
    }
    return accountOrAccountIdOrAddress
}

export async function getAccountById(accountId: string, accounts?: IPolkadotExtensionAccount[]): Promise<IPolkadotExtensionAccount> {
    const account = await getAccountOrAddress(accountId, accounts)
    if (typeof account === 'string') throw new Error('The input parameter is of the wrong type')
    return account
}

function normalizeUrl(url: string): string {
    // todo: parse string
    return `https://${url}/v1`;
}

// helper
export function initSDK(sdkInstanceOrChainNameOrUrl?: Client | string): Client {console.log(sdkInstanceOrChainNameOrUrl)
    if (!sdkInstanceOrChainNameOrUrl) throw new Error('sdkInstanceOrChainNameOrUrl parameter in function initSDK is empty')
    if (typeof sdkInstanceOrChainNameOrUrl === 'object') {
        if (sdkInstanceOrChainNameOrUrl instanceof Client) return sdkInstanceOrChainNameOrUrl
        throw new Error('The input parameter is of the wrong type')
    }
    if (typeof sdkInstanceOrChainNameOrUrl !== 'string') throw new Error('The input parameter is of the wrong type')
    const url = SDK_BASE_URLS[sdkInstanceOrChainNameOrUrl] || normalizeUrl(sdkInstanceOrChainNameOrUrl)

    const options = {
        baseUrl: url
    }
    const client = new Sdk(options)
    console.log(`SDK initialized at ${client.options.baseUrl}`)
    return client
}

export async function totalStaked(accountOrAccountIdOrAddress: IPolkadotExtensionAccount | string, sdkInstanceOrChainNameOrUrl: Client | string) {
    console.log('sdkInstanceOrChainNameOrUrl')
    console.log(sdkInstanceOrChainNameOrUrl)
    const sdk = initSDK(sdkInstanceOrChainNameOrUrl)
    const accountOrAddress = await getAccountOrAddress(accountOrAccountIdOrAddress)
    const address = typeof accountOrAddress === 'string' ? accountOrAddress : accountOrAddress.address

    const result = await sdk.stateQuery.execute({
            endpoint: 'rpc',
            module: 'appPromotion',
            method: 'totalStaked',
        },
        {args: [{Substrate: address} as any]}
    )
    // :todo value human to float
    return result
}

export async function amountCanBeStaked(accountOrAccountIdOrAddress: IPolkadotExtensionAccount | string, sdkInstanceOrChainNameOrUrl: Client | string) {
    const sdk = initSDK(sdkInstanceOrChainNameOrUrl)
    const accountOrAddress = await getAccountOrAddress(accountOrAccountIdOrAddress)
    const address = typeof accountOrAddress === 'string' ? accountOrAddress : accountOrAddress.address

    const balanceResponse = await sdk.balance.get({address})
    console.log(balanceResponse.availableBalance);
    return balanceResponse.availableBalance;
}

async function convertAmount(sdk: Client, amountInit: number | string): Promise<string> {
    const { decimals } = await sdk.common.chainProperties()
    const amountInitString = typeof amountInit === 'number' ? amountInit.toString() : amountInit
    const arr = amountInitString.split('.')
    let amount = arr[0] !== '0' ? arr[0] : ''
    if (arr[1]) {
        amount += arr[1] + Array(decimals - arr[1].length).fill('0').join('')
    } else {
        amount += Array(decimals).fill('0').join('')
    }
    return amount
}

export async function stake(accountOrAccountIdOrAddress: IPolkadotExtensionAccount | string, sdkInstanceOrChainNameOrUrl: Client | string, amountInit: number | string) {
    const sdk = initSDK(sdkInstanceOrChainNameOrUrl)
    const account = await getAccountOrAddress(accountOrAccountIdOrAddress)
    if (typeof account === 'string') throw new Error('Failed to get an account')

    if (!amountInit) throw new Error('Amount parameter is empty')
    const amount = await convertAmount(sdk, amountInit);

    return sdk.extrinsics.submitWaitResult({
        address: account.address,
        section: 'appPromotion',
        method: 'stake',
        args: [amount],
    }, account.uniqueSdkSigner);
}

export async function unstake(accountOrAccountIdOrAddress: IPolkadotExtensionAccount | string, sdkInstanceOrChainNameOrUrl: Client | string) {
    const sdk = initSDK(sdkInstanceOrChainNameOrUrl)
    const account = await getAccountOrAddress(accountOrAccountIdOrAddress)
    if (typeof account === 'string') throw new Error('Failed to get an account')

    const result = await sdk.extrinsics.submitWaitResult({
        address: account.address,
        section: 'appPromotion',
        method: 'unstake',
        args: [],
    }, account.uniqueSdkSigner)
    console.log('After the end of week this sum becomes completely free for further use')
    return result
}

async function balanceCanBeStaked(amount: number, account: IPolkadotExtensionAccount, sdkInstance?: Client , chainName?: sdkBaseUrl) {
    console.log('amount', amount)

    if (!account) {
        throw new Error('Set account for balanceCanBeStaked function');
    }

    let client = initSdkHelper(sdkInstance, chainName);

    const initBalanceResponse = await client.balance.get({address: account.address})
    console.log(initBalanceResponse)
    console.log(`Address ${account.address} can stake ${initBalanceResponse.availableBalance.formatted} ${initBalanceResponse.availableBalance.unit}`)
    console.log(`Address ${account.address} has staked ${initBalanceResponse.lockedBalance.formatted} ${initBalanceResponse.lockedBalance.unit}`)
    return initBalanceResponse.availableBalance;
}

const getBalanceAndStake = async (amount: number, account: IPolkadotExtensionAccount, sdkInstance?: Client , chainName?: sdkBaseUrl) => {
    console.log('amount', amount)

    // весь застейченный баланс отображается в lockedBalance
    const initBalanceResponse = await client.balance.get({address: account.address})
    console.log(initBalanceResponse)
    console.log(`Address ${account.address} has staked ${initBalanceResponse.lockedBalance.formatted} ${initBalanceResponse.lockedBalance.unit}`)

    throw new Error('COMMENT OUT THE LINE TO CONTINUE')

    // set stake
    const setStakeResult = await setStake(client, account.address, amount)
    console.log(setStakeResult)

    if (setStakeResult.error) throw new Error(setStakeResult.error.toString())


}

const registerStakingForm = async () => {
    const $form = document.querySelector('form#staking-form')
    if (!$form) throw new Error('Form not found')

    $form.addEventListener('submit', async (event) => {
        event.preventDefault()

        const $response = document.querySelector('#staking-response')
        if (!$response) throw new Error('Response DOM Node not found')

        try {
            const $amount = document.querySelector('#staking-amount') as HTMLInputElement | null
            if (!$amount) throw new Error('Amount not found')
            const amount = parseFloat($amount.value || '')
            if (isNaN(amount)) throw new Error('Amount is not a number')

            $response.textContent = `Staking...`

            await getBalanceAndStake(amount)

            $response.textContent = 'Output:\nstaked'

        } catch (e: any) {
            console.log(JSON.stringify(e))
            $response.textContent = `Error: ${(e && ('error' in e) ? e.error.message: e.message || e || 'unknown error')}`
        }
    })
}

// if (typeof window !== 'undefined') {
//   window.addEventListener('DOMContentLoaded', () => {
//     registerStakingForm().catch(err => console.error(err))
//   })
// }
// (async () => {
    // await sleep(2000); // without a pause an error extensionFound occurs
    // console.log(await getAccountList());
    // await totalStaked(sdkBaseUrl.opal);
// })();
