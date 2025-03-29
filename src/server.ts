import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { config } from 'dotenv';
import { EtherscanService, NetworkType } from './services/etherscanService.js';
import { z } from 'zod';

// Load environment variables
config();

const apiKey = process.env.ETHERSCAN_API_KEY;
if (!apiKey) {
  throw new Error('ETHERSCAN_API_KEY environment variable is required');
}

// Get default network from environment variable or default to ethereum
const defaultNetwork = (process.env.DEFAULT_EXPLORER_NETWORK || 'ethereum') as NetworkType;

// Define available networks
const availableNetworks: NetworkType[] = ['ethereum', 'sonic', 'base'];

// Initialize Etherscan service with all supported networks
const etherscanService = new EtherscanService(apiKey, defaultNetwork);

// Create server instance
const server = new Server(
  {
    name: "blockchain-explorer-server",
    version: "1.2.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define schemas for validation
const AddressSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format'),
  network: z.enum(['ethereum', 'sonic', 'base']).optional(),
});

const TransactionHistorySchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format'),
  limit: z.number().min(1).max(100).optional(),
  network: z.enum(['ethereum', 'sonic', 'base']).optional(),
});

const TokenTransferSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format'),
  limit: z.number().min(1).max(100).optional(),
  network: z.enum(['ethereum', 'sonic', 'base']).optional(),
});

const ContractSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format'),
  network: z.enum(['ethereum', 'sonic', 'base']).optional(),
});

const GasOracleSchema = z.object({
  network: z.enum(['ethereum', 'sonic', 'base']).optional(),
});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "check-balance",
        description: `Check the balance of an address on any supported blockchain network`,
        inputSchema: {
          type: "object",
          properties: {
            address: {
              type: "string",
              description: "Blockchain address (0x format)",
              pattern: "^0x[a-fA-F0-9]{40}$"
            },
            network: {
              type: "string",
              description: "Blockchain network to query (ethereum, sonic, or base). Defaults to ethereum if not specified.",
              enum: ["ethereum", "sonic", "base"]
            }
          },
          required: ["address"],
        },
      },
      {
        name: "get-transactions",
        description: `Get recent transactions for an address on any supported blockchain network`,
        inputSchema: {
          type: "object",
          properties: {
            address: {
              type: "string",
              description: "Blockchain address (0x format)",
              pattern: "^0x[a-fA-F0-9]{40}$"
            },
            limit: {
              type: "number",
              description: "Number of transactions to return (max 100)",
              minimum: 1,
              maximum: 100
            },
            network: {
              type: "string",
              description: "Blockchain network to query (ethereum, sonic, or base). Defaults to ethereum if not specified.",
              enum: ["ethereum", "sonic", "base"]
            }
          },
          required: ["address"],
        },
      },
      {
        name: "get-token-transfers",
        description: `Get token transfers for an address on any supported blockchain network`,
        inputSchema: {
          type: "object",
          properties: {
            address: {
              type: "string",
              description: "Blockchain address (0x format)",
              pattern: "^0x[a-fA-F0-9]{40}$"
            },
            limit: {
              type: "number",
              description: "Number of transfers to return (max 100)",
              minimum: 1,
              maximum: 100
            },
            network: {
              type: "string",
              description: "Blockchain network to query (ethereum, sonic, or base). Defaults to ethereum if not specified.",
              enum: ["ethereum", "sonic", "base"]
            }
          },
          required: ["address"],
        },
      },
      {
        name: "get-contract-abi",
        description: `Get the ABI for a smart contract on any supported blockchain network`,
        inputSchema: {
          type: "object",
          properties: {
            address: {
              type: "string",
              description: "Contract address (0x format)",
              pattern: "^0x[a-fA-F0-9]{40}$"
            },
            network: {
              type: "string",
              description: "Blockchain network to query (ethereum, sonic, or base). Defaults to ethereum if not specified.",
              enum: ["ethereum", "sonic", "base"]
            }
          },
          required: ["address"],
        },
      },
      {
        name: "get-gas-prices",
        description: `Get current gas prices on any supported blockchain network in Gwei`,
        inputSchema: {
          type: "object",
          properties: {
            network: {
              type: "string",
              description: "Blockchain network to query (ethereum, sonic, or base). Defaults to ethereum if not specified.",
              enum: ["ethereum", "sonic", "base"]
            }
          },
        },
      },
      {
        name: "get-ens-name",
        description: "Get the ENS name for an address (Ethereum mainnet only)",
        inputSchema: {
          type: "object",
          properties: {
            address: {
              type: "string",
              description: "Blockchain address (0x format)",
              pattern: "^0x[a-fA-F0-9]{40}$"
            },
            network: {
              type: "string",
              description: "Blockchain network to query (ethereum, sonic, or base). Defaults to ethereum if not specified.",
              enum: ["ethereum", "sonic", "base"]
            }
          },
          required: ["address"],
        },
      },
      {
        name: "list-supported-networks",
        description: "List all supported blockchain networks",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "check-balance") {
    try {
      const { address, network } = AddressSchema.parse(args);
      const balance = await etherscanService.getAddressBalance(address, network);
      const response = `Address: ${balance.address}\nBalance: ${balance.balanceInEth} ${balance.currencySymbol}\nNetwork: ${balance.network}`;
      return {
        content: [{ type: "text", text: response }],
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid input: ${error.errors.map(e => e.message).join(", ")}`);
      }
      throw error;
    }
  }

  if (name === "get-transactions") {
    try {
      const { address, limit, network } = TransactionHistorySchema.parse(args);
      const transactions = await etherscanService.getTransactionHistory(address, limit, network);
      const networkConfig = etherscanService.getNetworkConfig(network);
      
      const formattedTransactions = transactions.map(tx => {
        const date = new Date(tx.timestamp * 1000).toLocaleString();
        return `Block ${tx.blockNumber} (${date}):\n` +
               `Hash: ${tx.hash}\n` +
               `From: ${tx.from}\n` +
               `To: ${tx.to}\n` +
               `Value: ${tx.value} ${networkConfig.currencySymbol}\n` +
               `---`;
      }).join('\n');

      const selectedNetwork = network || defaultNetwork;
      const response = transactions.length > 0
        ? `Recent transactions for ${address} on ${selectedNetwork} network:\n\n${formattedTransactions}`
        : `No transactions found for ${address} on ${selectedNetwork} network`;

      return {
        content: [{ type: "text", text: response }],
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid input: ${error.errors.map(e => e.message).join(", ")}`);
      }
      throw error;
    }
  }

  if (name === "get-token-transfers") {
    try {
      const { address, limit, network } = TokenTransferSchema.parse(args);
      const transfers = await etherscanService.getTokenTransfers(address, limit, network);
      
      const formattedTransfers = transfers.map(tx => {
        const date = new Date(tx.timestamp * 1000).toLocaleString();
        return `Block ${tx.blockNumber} (${date}):\n` +
               `Token: ${tx.tokenName} (${tx.tokenSymbol})\n` +
               `From: ${tx.from}\n` +
               `To: ${tx.to}\n` +
               `Value: ${tx.value}\n` +
               `Contract: ${tx.token}\n` +
               `---`;
      }).join('\n');

      const selectedNetwork = network || defaultNetwork;
      const response = transfers.length > 0
        ? `Recent token transfers for ${address} on ${selectedNetwork} network:\n\n${formattedTransfers}`
        : `No token transfers found for ${address} on ${selectedNetwork} network`;

      return {
        content: [{ type: "text", text: response }],
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid input: ${error.errors.map(e => e.message).join(", ")}`);
      }
      throw error;
    }
  }

  if (name === "get-contract-abi") {
    try {
      const { address, network } = ContractSchema.parse(args);
      const abi = await etherscanService.getContractABI(address, network);
      const selectedNetwork = network || defaultNetwork;
      
      return {
        content: [{ type: "text", text: `Contract ABI for ${address} on ${selectedNetwork} network:\n\n${abi}` }],
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid input: ${error.errors.map(e => e.message).join(", ")}`);
      }
      throw error;
    }
  }

  if (name === "get-gas-prices") {
    try {
      const { network } = GasOracleSchema.parse(args);
      const prices = await etherscanService.getGasOracle(network);
      const selectedNetwork = network || defaultNetwork;
      
      const response = `Current Gas Prices on ${selectedNetwork} network:\n` +
                      `Safe Low: ${prices.safeGwei} Gwei\n` +
                      `Standard: ${prices.proposeGwei} Gwei\n` +
                      `Fast: ${prices.fastGwei} Gwei`;
      return {
        content: [{ type: "text", text: response }],
      };
    } catch (error) {
      throw error;
    }
  }

  if (name === "get-ens-name") {
    try {
      const { address, network } = AddressSchema.parse(args);
      const selectedNetwork = network || defaultNetwork;
      const ensName = await etherscanService.getENSName(address, network);
      
      // ENS is only available on Ethereum mainnet
      if (selectedNetwork !== 'ethereum') {
        return {
          content: [{ type: "text", text: `ENS is only available on Ethereum mainnet. Requested network: ${selectedNetwork}` }],
        };
      }
      
      const response = ensName
        ? `ENS name for ${address}: ${ensName}`
        : `No ENS name found for ${address}`;
      return {
        content: [{ type: "text", text: response }],
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid input: ${error.errors.map(e => e.message).join(", ")}`);
      }
      throw error;
    }
  }

  if (name === "list-supported-networks") {
    const networkDetails = availableNetworks.map(net => {
      const config = etherscanService.getNetworkConfig(net);
      return `- ${net.charAt(0).toUpperCase() + net.slice(1)}: ${config.currencySymbol}`;
    }).join('\n');
    
    const response = `Supported blockchain networks:\n${networkDetails}`;
    return {
      content: [{ type: "text", text: response }],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Start the server
export async function startServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Blockchain Explorer MCP Server running on stdio. Default network: ${defaultNetwork}`);
  console.error(`Supported networks: ${availableNetworks.join(', ')}`);
} 