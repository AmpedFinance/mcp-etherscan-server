import { ethers } from 'ethers';

export type NetworkType = 'ethereum' | 'sonic' | 'base';

export interface ApiEndpoints {
  apiUrl: string;
  networkName: string;
  currencySymbol: string;
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  blockNumber: number;
}

export interface TokenTransfer {
  token: string;
  tokenName: string;
  tokenSymbol: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  blockNumber: number;
}

export interface GasPrice {
  safeGwei: string;
  proposeGwei: string;
  fastGwei: string;
}

// Network configuration for different explorers
const NETWORK_CONFIGS: Record<NetworkType, ApiEndpoints> = {
  ethereum: {
    apiUrl: 'https://api.etherscan.io/api',
    networkName: 'mainnet',
    currencySymbol: 'ETH'
  },
  sonic: {
    apiUrl: 'https://explorer.sonic.onerpc.com/api',
    networkName: 'sonic',
    currencySymbol: 'SONIC'
  },
  base: {
    apiUrl: 'https://api.basescan.org/api',
    networkName: 'base',
    currencySymbol: 'ETH'
  }
};

export class EtherscanService {
  private providers: Record<NetworkType, ethers.EtherscanProvider>;
  private networkConfigs: Record<NetworkType, ApiEndpoints>;
  private apiKeys: Record<NetworkType, string>;
  private defaultNetwork: NetworkType;

  constructor(apiKeys: Record<NetworkType, string>, defaultNetwork: NetworkType = 'ethereum') {
    this.apiKeys = apiKeys;
    this.defaultNetwork = defaultNetwork;
    this.networkConfigs = NETWORK_CONFIGS;
    
    // Initialize providers for networks with API keys
    this.providers = {} as Record<NetworkType, ethers.EtherscanProvider>;
    for (const network of Object.keys(NETWORK_CONFIGS) as NetworkType[]) {
      if (this.apiKeys[network]) {
        this.providers[network] = new ethers.EtherscanProvider(
          NETWORK_CONFIGS[network].networkName, 
          this.apiKeys[network]
        );
      }
    }
  }
  
  // Helper to get the network configuration
  public getNetworkConfig(network?: NetworkType): ApiEndpoints {
    const selectedNetwork = network || this.defaultNetwork;
    return this.networkConfigs[selectedNetwork];
  }
  
  // Helper to get the provider for a specific network
  private getProvider(network?: NetworkType): ethers.EtherscanProvider {
    const selectedNetwork = network || this.defaultNetwork;
    
    if (!this.providers[selectedNetwork]) {
      throw new Error(`Network ${selectedNetwork} is not supported or missing API key`);
    }
    
    return this.providers[selectedNetwork];
  }
  
  // Check if a network is supported (has API key)
  public isNetworkSupported(network?: NetworkType): boolean {
    const selectedNetwork = network || this.defaultNetwork;
    return !!this.apiKeys[selectedNetwork] && !!this.providers[selectedNetwork];
  }

  async getAddressBalance(address: string, network?: NetworkType): Promise<{
    address: string;
    balanceInWei: bigint;
    balanceInEth: string;
    currencySymbol: string;
    network: NetworkType;
  }> {
    try {
      const selectedNetwork = network || this.defaultNetwork;
      const provider = this.getProvider(selectedNetwork);
      const networkConfig = this.getNetworkConfig(selectedNetwork);
      
      // Validate the address
      const validAddress = ethers.getAddress(address);
      
      // Get balance in Wei
      const balanceInWei = await provider.getBalance(validAddress);
      
      // Convert to ETH/SONIC/etc.
      const balanceInEth = ethers.formatEther(balanceInWei);

      return {
        address: validAddress,
        balanceInWei,
        balanceInEth,
        currencySymbol: networkConfig.currencySymbol,
        network: selectedNetwork
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get balance: ${error.message}`);
      }
      throw error;
    }
  }

  async getTransactionHistory(address: string, limit: number = 10, network?: NetworkType): Promise<Transaction[]> {
    try {
      const selectedNetwork = network || this.defaultNetwork;
      const networkConfig = this.getNetworkConfig(selectedNetwork);
      
      // Validate the address
      const validAddress = ethers.getAddress(address);
      
      // Get transactions directly from explorer API
      const result = await fetch(
        `${networkConfig.apiUrl}?module=account&action=txlist&address=${validAddress}&startblock=0&endblock=99999999&page=1&offset=${limit}&sort=desc&apikey=${this.apiKeys[selectedNetwork]}`
      );
      
      const data = await result.json();
      
      if (data.status !== "1" || !data.result) {
        throw new Error(data.message || "Failed to fetch transactions");
      }

      // Format the results
      return data.result.slice(0, limit).map((tx: any) => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to || 'Contract Creation',
        value: ethers.formatEther(tx.value),
        timestamp: parseInt(tx.timeStamp) || 0,
        blockNumber: parseInt(tx.blockNumber) || 0
      }));
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get transaction history: ${error.message}`);
      }
      throw error;
    }
  }

  async getTokenTransfers(address: string, limit: number = 10, network?: NetworkType): Promise<TokenTransfer[]> {
    try {
      const selectedNetwork = network || this.defaultNetwork;
      const networkConfig = this.getNetworkConfig(selectedNetwork);
      
      const validAddress = ethers.getAddress(address);
      
      // Get ERC20 token transfers
      const result = await fetch(
        `${networkConfig.apiUrl}?module=account&action=tokentx&address=${validAddress}&page=1&offset=${limit}&sort=desc&apikey=${this.apiKeys[selectedNetwork]}`
      );
      
      const data = await result.json();
      
      if (data.status !== "1" || !data.result) {
        throw new Error(data.message || "Failed to fetch token transfers");
      }

      // Format the results
      return data.result.slice(0, limit).map((tx: any) => ({
        token: tx.contractAddress,
        tokenName: tx.tokenName,
        tokenSymbol: tx.tokenSymbol,
        from: tx.from,
        to: tx.to,
        value: ethers.formatUnits(tx.value, parseInt(tx.tokenDecimal)),
        timestamp: parseInt(tx.timeStamp) || 0,
        blockNumber: parseInt(tx.blockNumber) || 0
      }));
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get token transfers: ${error.message}`);
      }
      throw error;
    }
  }

  async getContractABI(address: string, network?: NetworkType): Promise<string> {
    try {
      const selectedNetwork = network || this.defaultNetwork;
      const networkConfig = this.getNetworkConfig(selectedNetwork);
      
      const validAddress = ethers.getAddress(address);
      
      // Get contract ABI
      const result = await fetch(
        `${networkConfig.apiUrl}?module=contract&action=getabi&address=${validAddress}&apikey=${this.apiKeys[selectedNetwork]}`
      );
      
      const data = await result.json();
      
      if (data.status !== "1" || !data.result) {
        throw new Error(data.message || "Failed to fetch contract ABI");
      }

      return data.result;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get contract ABI: ${error.message}`);
      }
      throw error;
    }
  }

  async getGasOracle(network?: NetworkType): Promise<GasPrice> {
    try {
      const selectedNetwork = network || this.defaultNetwork;
      const networkConfig = this.getNetworkConfig(selectedNetwork);
      
      // Get current gas prices
      const result = await fetch(
        `${networkConfig.apiUrl}?module=gastracker&action=gasoracle&apikey=${this.apiKeys[selectedNetwork]}`
      );
      
      const data = await result.json();
      
      if (data.status !== "1" || !data.result) {
        throw new Error(data.message || "Failed to fetch gas prices");
      }

      return {
        safeGwei: data.result.SafeGasPrice,
        proposeGwei: data.result.ProposeGasPrice,
        fastGwei: data.result.FastGasPrice
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get gas prices: ${error.message}`);
      }
      throw error;
    }
  }

  async getENSName(address: string, network?: NetworkType): Promise<string | null> {
    try {
      const selectedNetwork = network || this.defaultNetwork;
      const provider = this.getProvider(selectedNetwork);
      const networkConfig = this.getNetworkConfig(selectedNetwork);
      
      const validAddress = ethers.getAddress(address);
      
      // For Ethereum mainnet, use the provider's lookupAddress method
      if (networkConfig.networkName === 'mainnet') {
        return await provider.lookupAddress(validAddress);
      }
      
      // For other networks that might not have ENS support
      // Return null or consider using network-specific name services where available
      return null;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get ENS name: ${error.message}`);
      }
      throw error;
    }
  }
} 