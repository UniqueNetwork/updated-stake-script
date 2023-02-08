
import {Client, Sdk} from '@unique-nft/sdk'
import Extension, {IPolkadotExtensionAccount} from '@unique-nft/utils/extension'
import {Address} from '@unique-nft/utils'

export const SDK_BASE_URLS: any = {
  opal: 'https://rest.opal.uniquenetwork.dev/v1',
  quartz: 'https://rest.quartz.uniquenetwork.dev/v1',
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
    if (!url.startsWith('https://')) url = 'https://' + url
    if (!url.endsWith('/v1')) url += '/v1'
    return url;
}

// helper
export function initSDK(sdkInstanceOrChainNameOrUrl?: Client | string): Client {
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

export async function totalStaked(accountOrAccountIdOrAddress: IPolkadotExtensionAccount | string, sdkInstanceOrChainNameOrUrl: Client | string): Promise<number> {
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
    console.log(result)
    if (result.empty) return 0
    return amountFloatFormat(sdk, result.human)
}

export async function amountCanBeStaked(accountOrAccountIdOrAddress: IPolkadotExtensionAccount | string, sdkInstanceOrChainNameOrUrl: Client | string): Promise<number> {
    const sdk = initSDK(sdkInstanceOrChainNameOrUrl)
    const accountOrAddress = await getAccountOrAddress(accountOrAccountIdOrAddress)
    const address = typeof accountOrAddress === 'string' ? accountOrAddress : accountOrAddress.address

    const balanceResponse = await sdk.balance.get({address})
    console.log(balanceResponse.availableBalance);
    return Number(balanceResponse.availableBalance.amount);
}

async function amountChainFormat(sdk: Client, initAmount: number | string): Promise<string> {
    const { decimals } = await sdk.common.chainProperties()
    const amountInitString = typeof initAmount === 'number' ? initAmount.toString() : initAmount
    const arr = amountInitString.split('.')
    let amount = arr[0] !== '0' ? arr[0] : ''
    if (arr[1]) {
        amount += arr[1] + Array(decimals - arr[1].length).fill('0').join('')
    } else {
        amount += Array(decimals).fill('0').join('')
    }
    return amount
}

async function amountFloatFormat(sdk: Client, initAmount: string): Promise<number> {
    const { decimals } = await sdk.common.chainProperties()

    const amountWithoutComma = initAmount.replace(/,/gi, '')
    const lengthString = amountWithoutComma.length
    const amountWithDecimalPoint = amountWithoutComma.substring(0, lengthString - decimals) + '.' + amountWithoutComma.substring(lengthString - decimals);

    return Number(amountWithDecimalPoint)
}

export async function stake(accountOrAccountIdOrAddress: IPolkadotExtensionAccount | string, sdkInstanceOrChainNameOrUrl: Client | string, initAmount: number | string): Promise<{success: boolean}> {
    const sdk = initSDK(sdkInstanceOrChainNameOrUrl)
    const account = await getAccountOrAddress(accountOrAccountIdOrAddress)
    if (typeof account === 'string') throw new Error('Failed to get an account')

    if (!initAmount) throw new Error('Amount parameter is empty')
    const amount = await amountChainFormat(sdk, initAmount);

    const result:any = await sdk.extrinsics.submitWaitResult({
        address: account.address,
        section: 'appPromotion',
        method: 'stake',
        args: [amount],
    }, account.uniqueSdkSigner)
    console.log(result)
    if (result.error) throw new Error(result.error.message)
    return { success: true }
}

export async function unstake(accountOrAccountIdOrAddress: IPolkadotExtensionAccount | string, sdkInstanceOrChainNameOrUrl: Client | string): Promise<{success: boolean}> {
    const sdk = initSDK(sdkInstanceOrChainNameOrUrl)
    const account = await getAccountOrAddress(accountOrAccountIdOrAddress)
    if (typeof account === 'string') throw new Error('Failed to get an account')

    const result:any = await sdk.extrinsics.submitWaitResult({
        address: account.address,
        section: 'appPromotion',
        method: 'unstake',
        args: [],
    }, account.uniqueSdkSigner)
    console.log(result)
    if (result.error) throw new Error(result.error.message)
    console.log('After the end of week this sum becomes completely free for further use')
    return { success: true }
}
