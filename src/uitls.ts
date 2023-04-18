import { Client } from '@unique-nft/sdk'

type SdkOrDecimals = Client | number;

async function getDecimals(sdkOrDecimals: SdkOrDecimals): Promise<number> {
  if (typeof sdkOrDecimals === 'number') return sdkOrDecimals

  return (await sdkOrDecimals.common.chainProperties()).decimals
}

export async function amountChainFormat(sdkOrDecimals: SdkOrDecimals, initAmount: number | string): Promise<string> {
  const decimals = await getDecimals(sdkOrDecimals)

  const amountInitString = typeof initAmount === 'number' ? initAmount.toString() : initAmount
  const arr = amountInitString.split('.')
  let amount = arr[0] !== '0' ? arr[0] : ''
  if (arr[1]) {
    amount +=
      arr[1] +
      Array(decimals - arr[1].length)
        .fill('0')
        .join('')
  } else {
    amount += Array(decimals).fill('0').join('')
  }
  return amount
}

export async function amountFloatFormat(sdkOrDecimals: SdkOrDecimals, initAmount: string): Promise<number> {
  const decimals = await getDecimals(sdkOrDecimals)

  const amountAsString = initAmount.replace(/[^0-9]/g, "").padStart(decimals + 1, '0');

  const integerPart = amountAsString.slice(0, -decimals);
  const decimalPart = amountAsString.slice(-decimals);

  return parseFloat(`${integerPart}.${decimalPart}`);
}