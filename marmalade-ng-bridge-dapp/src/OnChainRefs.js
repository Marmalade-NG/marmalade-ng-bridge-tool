const MAINNET =
{
  name:"Mainnet",
  node:"https://api.chainweb.com",
  network:"mainnet01",
  bridge_ns: "n_4e470b4e150fafd1c50d1f016331142b55dd01db",
  interface_ns: "n_4e47017ea6449649e13d79906dd1697fb1fe1d7a"
}

const TESTNET =
{
  name:"Testnet",
  node:"https://api.testnet.chainweb.com",
  network:"testnet04",
  bridge_ns: "n_a55cdf159bc9fda0a8af03a71bb046942b1e4faf",
  interface_ns: "n_5caec7ffe20c6e09fd632fb1ee04468848966332"
}

const TESTNET_CHAIN_0_LEDGER =
{
  name: "Marmalade NG Chain 0",
  ledger: "n_442d3e11cfe0d39859878e5b1520cd8b8c36e5db.ledger",
  chain: "0"
}

const TESTNET_CHAIN_1_LEDGER =
{
  name: "Marmalade NG Chain 1",
  ledger: "n_442d3e11cfe0d39859878e5b1520cd8b8c36e5db.ledger",
  chain: "1"
}

const MAINNET_CHAIN_8_LEDGER =
{
  name: "Marmalade NG Chain 8",
  ledger: "n_4e470a97222514a8662dd1219000a0431451b0ee.ledger",
  chain: "8"
}

const MAINNET_CHAIN_1_LEDGER =
{
  name: "Marmalade NG Chain 1",
  ledger: "n_4e470a97222514a8662dd1219000a0431451b0ee.ledger",
  chain: "1"
}

const TESTNET_MARM_V1 =
{
  name: "Marmalade V1",
  ledger: "marmalade.ledger",
  chain: "1"
}

const MAINNET_MARM_V1 =
{
  name: "Marmalade V1",
  ledger: "marmalade.ledger",
  chain: "8"
}


export const PREDEF_LEDGERS =
{
  "testnet04": [TESTNET_CHAIN_0_LEDGER, TESTNET_CHAIN_1_LEDGER, TESTNET_MARM_V1],
  "mainnet01": [MAINNET_CHAIN_8_LEDGER, MAINNET_CHAIN_1_LEDGER, MAINNET_MARM_V1]
}


export const INSTANCES = {"Mainnet":MAINNET,
                          "Testnet":TESTNET
                         }

export const DEFAULT_INSTANCE = INSTANCES[import.meta.env.VITE_DEFAULT_INSTANCE];
